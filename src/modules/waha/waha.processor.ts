import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WahaMessageLog } from '../../schemas/waha-message-log.schema';
import { WahaCampaign } from '../../schemas/waha-campaign.schema';
import { Institute } from '../../schemas/institute.schema';

@Processor('waha-messages')
@Injectable()
export class WahaProcessor extends WorkerHost {
  private readonly logger = new Logger(WahaProcessor.name);

  constructor(
    @InjectModel(WahaMessageLog.name) private messageLogModel: Model<WahaMessageLog>,
    @InjectModel(WahaCampaign.name) private campaignModel: Model<WahaCampaign>,
    @InjectModel(Institute.name) private instituteModel: Model<Institute>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { messageLogId, campaignId, instituteId, recipientNumber, messageContent } = job.data;
    
    this.logger.debug(`Processing WhatsApp message to ${recipientNumber} for campaign ${campaignId}`);

    try {
      const institute = await this.instituteModel.findById(instituteId);
      
      if (!institute || institute.wahaStatus !== 'CONNECTED') {
        throw new Error('WhatsApp session is disconnected or institute not found');
      }

      const wahaSessionId = institute.wahaSessionId;

      // Make the actual API call to WAHA Core
      const wahaApiUrl = process.env.WAHA_API_URL || 'http://localhost:3000';
      const response = await axios.post(
        `${wahaApiUrl}/api/sendText`,
        {
          session: 'default', // Core only supports "default"
          chatId: `${recipientNumber}@c.us`,
          text: messageContent,
        },
        {
          headers: {
            'X-Api-Key': 'edufusion123'
          }
        }
      );
      
      await this.messageLogModel.findByIdAndUpdate(messageLogId, {
        status: 'SENT',
        sentAt: new Date(),
      });

      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { successfulCount: 1 },
      });

      this.logger.debug(`Successfully sent message to ${recipientNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp message to ${recipientNumber}`, error.stack);
      
      // Mark as failed
      await this.messageLogModel.findByIdAndUpdate(messageLogId, {
        status: 'FAILED',
        errorMessage: error.message || 'Unknown Error',
      });

      await this.campaignModel.findByIdAndUpdate(campaignId, {
        $inc: { failedCount: 1 },
      });
    }

    // Check if campaign is completed
    const campaign = await this.campaignModel.findById(campaignId);
    if (campaign && (campaign.successfulCount + campaign.failedCount >= campaign.totalRecipients)) {
      await this.campaignModel.findByIdAndUpdate(campaignId, {
        status: 'COMPLETED',
      });
      this.logger.log(`Campaign ${campaignId} completed.`);
    }

    // Add a delay to prevent spam banning
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
