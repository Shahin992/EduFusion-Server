import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly onesignalUrl = 'https://onesignal.com/api/v1/notifications';

  async sendToInstitute(instituteId: string, title: string, message: string) {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !apiKey) {
      this.logger.warn('OneSignal credentials not found in environment variables. Skipping notification.');
      return;
    }

    try {
      await axios.post(
        this.onesignalUrl,
        {
          app_id: appId,
          headings: { en: title },
          contents: { en: message },
          filters: [
            { field: 'tag', key: 'instituteId', relation: '=', value: instituteId }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${apiKey}`,
          },
        }
      );
      this.logger.log(`Notification sent to institute ${instituteId}: ${title}`);
    } catch (error) {
      this.logger.error('Failed to send OneSignal notification', error?.response?.data || error.message);
    }
  }
}
