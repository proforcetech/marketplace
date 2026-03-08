import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global()
@Module({
  providers: [
    StorageService,
    { provide: 'STORAGE_SERVICE', useExisting: StorageService },
  ],
  exports: [
    StorageService,
    'STORAGE_SERVICE',
  ],
})
export class StorageModule {}
