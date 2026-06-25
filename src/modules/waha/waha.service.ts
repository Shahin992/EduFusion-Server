import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import axios from 'axios';
import { Institute } from '../../schemas/institute.schema';
import { WahaCampaign } from '../../schemas/waha-campaign.schema';
import { WahaMessageLog } from '../../schemas/waha-message-log.schema';

@Injectable()
export class WahaService {
  constructor(
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
    @InjectModel(WahaCampaign.name) private campaignModel: Model<WahaCampaign>,
    @InjectModel(WahaMessageLog.name) private messageLogModel: Model<WahaMessageLog>,
    @InjectQueue('waha-messages') private wahaQueue: Queue,
  ) {}

  async getSessionStatus(instituteId: string) {
    const institute = await this.instituteModel.findById(instituteId);
    if (!institute) throw new BadRequestException('Institute not found');

    try {
      const sessionId = 'default';
      const wahaApiUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
      const res = await axios.get(`${wahaApiUrl}/api/sessions/${sessionId}`, {
        headers: { 'X-Api-Key': 'edufusion123' }
      });
      const data = res.data;
      
      // Map WORKING to CONNECTED for frontend UI
      const status = data.status === 'WORKING' ? 'CONNECTED' : data.status;
      
      // Sync with DB if state changed
      if (status === 'CONNECTED' && institute.wahaStatus !== 'CONNECTED') {
        await this.instituteModel.findByIdAndUpdate(instituteId, {
          wahaStatus: 'CONNECTED',
          wahaNumber: data.me?.id,
          wahaConnectedAt: new Date(),
        });
      } else if (status !== 'CONNECTED' && institute.wahaStatus === 'CONNECTED') {
        await this.instituteModel.findByIdAndUpdate(instituteId, { wahaStatus: status });
      }

      return {
        status: status,
        number: data.me?.id || institute.wahaNumber,
        connectedAt: institute.wahaConnectedAt || new Date(),
      };
    } catch (e) {
      // If 404 or engine offline, it's uninitialized
      return {
        status: 'UNINITIALIZED',
        number: null,
        connectedAt: null,
      };
    }
  }

  async startSession(instituteId: string) {
    const institute = await this.instituteModel.findById(instituteId);
    if (!institute) throw new BadRequestException('Institute not found');
    
    try {
      // WAHA Core only supports the 'default' session name
      const sessionId = 'default';
      
      // Start session
      try {
        const wahaApiUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
        await axios.post(`${wahaApiUrl}/api/sessions/start`, {
          name: sessionId,
          config: {}
        }, {
          headers: { 'X-Api-Key': 'edufusion123' }
        });
      } catch (startErr) {
        // Ignore error if session is already started (422)
        if (startErr.response?.status !== 422) throw startErr;
      }

      // Wait a bit for the engine to initialize the QR code
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get QR code
      const wahaApiUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
      const qrRes = await axios.get(`${wahaApiUrl}/api/${sessionId}/auth/qr?format=image`, {
        responseType: 'arraybuffer',
        headers: { 'X-Api-Key': 'edufusion123' }
      });
      
      const base64Qr = Buffer.from(qrRes.data, 'binary').toString('base64');
      
      // Update DB with pending status
      await this.instituteModel.findByIdAndUpdate(instituteId, {
        wahaSessionId: sessionId,
      });

      return {
        success: true,
        message: 'QR code generated. Please scan.',
        data: { qrCode: `data:image/png;base64,${base64Qr}` },
      };
    } catch (err) {
      console.error('WAHA API Error:', err.message);
      throw new BadRequestException('WhatsApp Engine is starting up or unavailable. Please try again in 10-20 seconds.');
    }
  }

  async disconnectSession(instituteId: string) {
    await this.instituteModel.findByIdAndUpdate(instituteId, {
      wahaStatus: 'DISCONNECTED',
      wahaSessionId: null,
      wahaNumber: null,
      wahaConnectedAt: null,
    });
    
    // In a real implementation, call WAHA API to stop session
    
    return {
      success: true,
      message: 'WhatsApp disconnected successfully',
    };
  }

  async getCampaigns(instituteId: string) {
    const campaigns = await this.campaignModel.find({ instituteId }).sort({ createdAt: -1 }).limit(20);
    return { success: true, data: campaigns };
  }

  async createCampaign(instituteId: string, payload: any, userId: string) {
    const institute = await this.instituteModel.findById(instituteId);
    if (institute.wahaStatus !== 'CONNECTED') {
      throw new BadRequestException('WhatsApp is not connected for this institute');
    }

    const { title, type, recipients, messageTemplate } = payload;
    
    const campaign = new this.campaignModel({
      instituteId,
      title,
      type,
      totalRecipients: recipients.length,
      createdBy: userId,
      status: 'PENDING',
    });
    await campaign.save();

    // Create message logs and push to BullMQ
    const jobs = [];
    for (const recipient of recipients) {
      const messageLog = new this.messageLogModel({
        campaignId: campaign._id,
        instituteId,
        recipientNumber: recipient.number,
        recipientName: recipient.name,
        messageContent: messageTemplate,
        status: 'PENDING',
      });
      await messageLog.save();

      jobs.push({
        name: 'send-waha-message',
        data: {
          messageLogId: messageLog._id.toString(),
          campaignId: campaign._id.toString(),
          instituteId,
          recipientNumber: recipient.number,
          messageContent: messageTemplate,
        },
      });
    }

    if (jobs.length > 0) {
      await this.campaignModel.findByIdAndUpdate(campaign._id, { status: 'PROCESSING' });
      await this.wahaQueue.addBulk(jobs);
    } else {
      await this.campaignModel.findByIdAndUpdate(campaign._id, { status: 'COMPLETED' });
    }

    return { success: true, message: 'Campaign started', data: campaign };
  }
}
