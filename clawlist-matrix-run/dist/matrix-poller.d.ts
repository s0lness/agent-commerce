/**
 * Matrix Poller - Autonomous message monitoring for buyer agents
 *
 * Polls Matrix /sync endpoint to watch for new marketplace listings.
 * When a listing matches buyer interests, triggers agent via system event.
 */
import { RoomEvent } from './matrix-api.js';
interface BuyerConfig {
    profile: string;
    interests: string[];
    mxid: string;
    accessToken: string;
    gatewayUrl: string;
    gatewayToken: string;
}
export declare class MatrixPoller {
    private homeserver;
    private marketRoomId;
    private buyers;
    private state;
    private stateFile;
    private pollInterval;
    private running;
    constructor(homeserver: string, marketRoomId: string, buyers: BuyerConfig[], stateFile: string, pollInterval?: number);
    /** Load state from disk */
    loadState(): Promise<void>;
    /** Save state to disk */
    saveState(): Promise<void>;
    /** Check if message matches buyer interests */
    matchesInterests(buyer: BuyerConfig, message: string): boolean;
    /** Trigger agent run via system event */
    triggerAgent(buyer: BuyerConfig, listing: RoomEvent): Promise<void>;
    /** Poll Matrix once */
    poll(): Promise<void>;
    /** Process a single Matrix event */
    private processEvent;
    /** Start polling loop */
    start(): Promise<void>;
    /** Stop polling loop */
    stop(): void;
}
export {};
//# sourceMappingURL=matrix-poller.d.ts.map