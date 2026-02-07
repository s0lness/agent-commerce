/**
 * Matrix Poller - Autonomous message monitoring for buyer agents
 *
 * Polls Matrix /sync endpoint to watch for new marketplace listings.
 * When a listing matches buyer interests, triggers agent via system event.
 */
import { createClient } from './matrix-api.js';
import { log, logError, sleep, readEnvFile, writeEnvFile } from './common.js';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
export class MatrixPoller {
    homeserver;
    marketRoomId;
    buyers;
    state;
    stateFile;
    pollInterval; // ms
    running = false;
    constructor(homeserver, marketRoomId, buyers, stateFile, pollInterval = 30000 // 30s default
    ) {
        this.homeserver = homeserver;
        this.marketRoomId = marketRoomId;
        this.buyers = buyers;
        this.stateFile = stateFile;
        this.pollInterval = pollInterval;
        this.state = {
            seenMessages: new Set(),
            lastPollTime: 0,
        };
    }
    /** Load state from disk */
    async loadState() {
        try {
            const data = await readEnvFile(this.stateFile);
            if (data.nextBatch)
                this.state.nextBatch = data.nextBatch;
            if (data.seenMessages) {
                this.state.seenMessages = new Set(JSON.parse(data.seenMessages));
            }
            if (data.lastPollTime) {
                this.state.lastPollTime = parseInt(data.lastPollTime);
            }
            log('poller', `loaded state: ${this.state.seenMessages.size} seen messages`);
        }
        catch (err) {
            if (err.code !== 'ENOENT') {
                logError('poller', `failed to load state: ${err.message}`);
            }
        }
    }
    /** Save state to disk */
    async saveState() {
        try {
            await mkdir(join(this.stateFile, '..'), { recursive: true });
            await writeEnvFile(this.stateFile, {
                nextBatch: this.state.nextBatch || '',
                seenMessages: JSON.stringify([...this.state.seenMessages]),
                lastPollTime: this.state.lastPollTime.toString(),
            });
        }
        catch (err) {
            logError('poller', `failed to save state: ${err.message}`);
        }
    }
    /** Check if message matches buyer interests */
    matchesInterests(buyer, message) {
        const lower = message.toLowerCase();
        return buyer.interests.some((keyword) => lower.includes(keyword.toLowerCase()));
    }
    /** Trigger agent run via system event */
    async triggerAgent(buyer, listing) {
        const body = listing.content?.body || '';
        log('poller', `triggering ${buyer.profile} for listing: ${body.substring(0, 60)}...`);
        try {
            const { exec } = await import('./common.js');
            const message = `NEW LISTING ALERT: 
      
Listing in #market:localhost matches your interests!

Message: ${body.substring(0, 200)}
From: ${listing.sender}

Action: DM the seller now to start negotiating. Ask about condition, accessories, price, and pickup location.`;
            await exec(`openclaw --profile "${buyer.profile}" system event ` +
                `--url "${buyer.gatewayUrl}" ` +
                `--token "${buyer.gatewayToken}" ` +
                `--text "${message.replace(/"/g, '\\"')}"`);
            log('poller', `triggered ${buyer.profile} successfully`);
        }
        catch (err) {
            logError('poller', `failed to trigger ${buyer.profile}: ${err.message}`);
        }
    }
    /** Poll Matrix once */
    async poll() {
        const client = createClient(this.homeserver, this.buyers[0]?.accessToken);
        try {
            // Use /sync with filter for the market room only
            const params = new URLSearchParams({
                timeout: '30000', // long poll for 30s
                filter: JSON.stringify({
                    room: {
                        rooms: [this.marketRoomId],
                        timeline: { limit: 10 },
                    },
                }),
            });
            if (this.state.nextBatch) {
                params.set('since', this.state.nextBatch);
            }
            const url = `${this.homeserver}/_matrix/client/v3/sync?${params}`;
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${this.buyers[0].accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Sync failed: ${response.status}`);
            }
            const data = await response.json();
            // Update next batch token
            this.state.nextBatch = data.next_batch;
            // Process new messages in market room
            const roomData = data.rooms?.join?.[this.marketRoomId];
            if (roomData?.timeline?.events) {
                for (const event of roomData.timeline.events) {
                    await this.processEvent(event);
                }
            }
            this.state.lastPollTime = Date.now();
            await this.saveState();
        }
        catch (err) {
            logError('poller', `poll failed: ${err.message}`);
        }
    }
    /** Process a single Matrix event */
    async processEvent(event) {
        // Skip if already seen
        if (this.state.seenMessages.has(event.event_id || '')) {
            return;
        }
        // Only process room messages
        if (event.type !== 'm.room.message') {
            return;
        }
        const body = event.content?.body || '';
        // Skip empty messages
        if (!body.trim()) {
            return;
        }
        // Mark as seen
        this.state.seenMessages.add(event.event_id || '');
        // Check if this is a listing (contains "SELLING" or "RUN_ID")
        const isListing = body.includes('SELLING') ||
            body.includes('RUN_ID') ||
            body.match(/asking \d+€/) ||
            body.match(/price.*\d+/i);
        if (!isListing) {
            return;
        }
        log('poller', `new listing detected: ${body.substring(0, 60)}...`);
        // Check each buyer's interests
        for (const buyer of this.buyers) {
            if (this.matchesInterests(buyer, body)) {
                // Wait random delay (30-90s) to avoid instant responses
                const delayMs = 30000 + Math.random() * 60000;
                log('poller', `buyer ${buyer.profile} interested, waiting ${Math.round(delayMs / 1000)}s`);
                setTimeout(() => {
                    this.triggerAgent(buyer, event).catch((err) => {
                        logError('poller', `trigger failed: ${err.message}`);
                    });
                }, delayMs);
            }
        }
    }
    /** Start polling loop */
    async start() {
        this.running = true;
        log('poller', `starting poller (interval: ${this.pollInterval}ms)`);
        await this.loadState();
        while (this.running) {
            await this.poll();
            await sleep(this.pollInterval);
        }
    }
    /** Stop polling loop */
    stop() {
        log('poller', 'stopping poller');
        this.running = false;
    }
}
//# sourceMappingURL=matrix-poller.js.map