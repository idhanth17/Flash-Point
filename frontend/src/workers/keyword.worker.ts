// Web worker for keyword matching
self.onmessage = function (e) {
    const { transcript, keywords, isFinal, timestamp, words, transcriptId } = e.data;
    if (!transcript || !keywords || keywords.length === 0) return;

    // Process only on final transcript to prevent duplicate alerts from interim guesses
    if (!isFinal) return;

    const lowerTranscript = transcript.toLowerCase();

    const firstWordStart = (words && words.length > 0 && typeof words[0].start === 'number') ? words[0].start : 0;
    const offset = (timestamp || 0) - firstWordStart;

    keywords.forEach((k: any) => {
        const keyword = k.word.toLowerCase();

        if (words && words.length > 0) {
            words.forEach((w: any) => {
                const text = w.punctuated_word || w.word || "";
                if (!text) return;

                // Aggressively strip everything but letters/numbers to prevent punctuation misses
                const wClean = text.toLowerCase().replace(/[^a-z0-9]/g, "");
                const kClean = keyword.replace(/[^a-z0-9]/g, "");

                if (wClean === kClean || wClean.includes(kClean)) {
                    self.postMessage({
                        type: 'match',
                        data: {
                            word: k.word,
                            timestamp: w.start !== undefined ? w.start + offset : timestamp || 0,
                            isFinal,
                            transcriptId
                        }
                    });
                }
            });
        } else {
            // Fallback string matching if chunk has no word array for some reason
            const lowerTranscriptClean = lowerTranscript.replace(/[^a-z0-9 ]/g, "");
            const kClean = keyword.replace(/[^a-z0-9]/g, "");

            if (lowerTranscriptClean.includes(kClean)) {
                // Approximate match counting by finding all occurrences
                const count = lowerTranscriptClean.split(kClean).length - 1;
                for (let i = 0; i < count; i++) {
                    self.postMessage({
                        type: 'match',
                        data: {
                            word: k.word,
                            timestamp: timestamp || 0,
                            isFinal,
                            transcriptId
                        }
                    });
                }
            }
        }
    });
};
