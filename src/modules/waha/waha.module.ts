import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WahaService } from './waha.service';
import { WahaController } from './waha.controller';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';
import { WahaCampaign, WahaCampaignSchema } from '../../schemas/waha-campaign.schema';
import { WahaMessageLog, WahaMessageLogSchema } from '../../schemas/waha-message-log.schema';
import { BullModule } from '@nestjs/bullmq';
import { WahaProcessor } from './waha.processor';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Institute.name, schema: InstituteSchema },
      { name: WahaCampaign.name, schema: WahaCampaignSchema },
      { name: WahaMessageLog.name, schema: WahaMessageLogSchema },
    ]),
    BullModule.registerQueue({
      name: 'waha-messages',
    }),
  ],
  controllers: [WahaController],
  providers: [WahaService, WahaProcessor],
  exports: [WahaService],
})
export class WahaModule {}
