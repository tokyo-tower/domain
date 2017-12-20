/**
 * 組織ファクトリー
 * @namespace organization
 */

import { IBilingualString } from './multilingualString';
import OrganizationType from './organizationType';
import { IURL } from './url';

/**
 * 組織インターフェース
 */
export interface IOrganization {
    id: string;
    identifier: string;
    name: IBilingualString;
    legalName: IBilingualString;
    typeOf: OrganizationType;
    location?: any;
    telephone?: string;
    url?: IURL;
}
