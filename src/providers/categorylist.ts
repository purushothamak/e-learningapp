import { Injectable } from '@angular/core';
import { CoreAppProvider, CoreAppSchema } from './app';
import { SQLiteDB } from '@classes/sqlitedb';
import { makeSingleton } from '@singletons/core.singletons';

/**
 * Factory to provide access to dynamic and permanent config and settings.
 * It should not be abused into a temporary storage.
 */
@Injectable()
export class categorylist {
    catId: number;
    catName: string;
}