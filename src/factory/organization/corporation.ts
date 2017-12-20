/**
 * 企業ファクトリー
 * @namespace organization.corporation
 */

import * as OrganizationFactory from '../organization';

/**
 * 企業組織インターフェース
 */
export interface IOrganization extends OrganizationFactory.IOrganization {
    /**
     * 組織識別子
     */
    identifier: string;
}
