import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiLabController } from './ai-lab.controller';
import { AiLabService } from './ai-lab.service';
import { AIQuestion, AIQuestionSchema } from '../../schemas/ai-question.schema';
import { AIQuestionSet, AIQuestionSetSchema } from '../../schemas/ai-question-set.schema';
import { Institute, InstituteSchema } from '../../schemas/institute.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AIQuestion.name, schema: AIQuestionSchema },
      { name: AIQuestionSet.name, schema: AIQuestionSetSchema },
      { name: Institute.name, schema: InstituteSchema },
    ]),
  ],
  controllers: [AiLabController],
  providers: [AiLabService],
  exports: [AiLabService],
})
export class AiLabModule {}
