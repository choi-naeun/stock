import { Global, Module } from '@nestjs/common';

import { SlackNotifier } from './slack-notifier';

@Global()
@Module({
  providers: [SlackNotifier],
  exports: [SlackNotifier],
})
export class OpsModule {}
