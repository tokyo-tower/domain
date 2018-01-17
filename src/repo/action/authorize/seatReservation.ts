import * as factory from '@motionpicture/ttts-factory';
import { MongoRepository as AuthorizeActionRepository } from '../authorize';

/**
 * 座席予約承認アクションレポジトリー
 * @export
 * @class
 */
export class MongoRepository extends AuthorizeActionRepository {
    protected readonly purpose: string = factory.action.authorize.authorizeActionPurpose.SeatReservation;

    public async start(
        agent: factory.action.IParticipant,
        recipient: factory.action.IParticipant,
        object: factory.action.authorize.seatReservation.IObject
    ): Promise<factory.action.authorize.creditCard.IAction> {
        const actionAttributes = factory.action.authorize.seatReservation.createAttributes({
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            object: object,
            agent: agent,
            recipient: recipient,
            startDate: new Date()
        });

        return this.actionModel.create(actionAttributes).then(
            (doc) => <factory.action.authorize.creditCard.IAction>doc.toObject()
        );
    }

    public async complete(
        actionId: string,
        result: factory.action.authorize.seatReservation.IResult
    ): Promise<factory.action.authorize.seatReservation.IAction> {
        return this.actionModel.findByIdAndUpdate(
            actionId,
            {
                actionStatus: factory.actionStatusType.CompletedActionStatus,
                result: result,
                endDate: new Date()
            },
            { new: true }
        ).exec().then((doc) => {
            if (doc === null) {
                throw new factory.errors.NotFound('authorizeAction');
            }

            return <factory.action.authorize.seatReservation.IAction>doc.toObject();
        });
    }

    public async cancel(
        actionId: string,
        transactionId: string
    ): Promise<factory.action.authorize.seatReservation.IAction> {
        return this.actionModel.findOneAndUpdate(
            {
                _id: actionId,
                typeOf: factory.actionType.AuthorizeAction,
                'object.transactionId': transactionId,
                'purpose.typeOf': this.purpose
            },
            { actionStatus: factory.actionStatusType.CanceledActionStatus },
            { new: true }
        ).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('authorizeAction');

                }

                return <factory.action.authorize.seatReservation.IAction>doc.toObject();
            });
    }

    /**
     * 座席予約承認アクションの供給情報を変更する
     * 座席仮予約ができている状態で券種だけ変更する場合に使用
     */
    public async updateObjectAndResultById(
        actionId: string,
        transactionId: string,
        object: factory.action.authorize.seatReservation.IObject,
        result: factory.action.authorize.seatReservation.IResult
    ): Promise<factory.action.authorize.seatReservation.IAction> {
        return this.actionModel.findOneAndUpdate(
            {
                _id: actionId,
                typeOf: factory.actionType.AuthorizeAction,
                'object.transactionId': transactionId,
                'purpose.typeOf': this.purpose,
                actionStatus: factory.actionStatusType.CompletedActionStatus // 完了ステータスのアクションのみ
            },
            {
                object: object,
                result: result
            },
            { new: true }
        ).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('authorizeAction');

                }

                return <factory.action.authorize.seatReservation.IAction>doc.toObject();
            });
    }

    public async findById(
        actionId: string
    ): Promise<factory.action.authorize.seatReservation.IAction> {
        return this.actionModel.findOne(
            {
                _id: actionId,
                typeOf: factory.actionType.AuthorizeAction
            }
        ).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('authorizeAction');
                }

                return <factory.action.authorize.seatReservation.IAction>doc.toObject();
            });
    }
}
