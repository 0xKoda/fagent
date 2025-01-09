/**
 * Twitter Interface Definition
 * Defines the contract for Twitter client implementations:
 * - Specifies required methods for Twitter interactions
 * - Ensures consistency across different Twitter client implementations
 */
export interface TwitterInterface {
    initialize(): Promise<void>;
    postTweet(text: string): Promise<any>;
}
