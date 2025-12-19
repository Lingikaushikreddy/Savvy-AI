
export interface CoachingMetrics {
    pace: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
}

export interface SessionConfig {
    recordAudio: boolean;
    showOverlay: boolean;
}
