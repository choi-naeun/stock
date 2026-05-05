import { Module } from '@nestjs/common';

import { SupabaseAuthGuard } from './supabase.guard';

@Module({
  providers: [SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
