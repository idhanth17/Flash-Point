const fs = require('fs');

async function testDeepgram() {
    const deepgram = require("@deepgram/sdk").createClient(process.env.DEEPGRAM_API_KEY);
    const audioFilePath = process.argv[2];

    if (!audioFilePath) {
        console.error("Please provide an audio file path.");
        process.exit(1);
    }

    console.log(`Transcribing \${audioFilePath}...`);
    const buffer = fs.readFileSync(audioFilePath);

    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        buffer,
        {
            model: "nova-3",
            smart_format: true,
            utterances: true,
        }
    );

    if (error) {
        console.error(error);
        return;
    }

    const utterances = result?.results?.utterances;
    if (utterances && utterances.length > 0) {
        console.log(`\nFound \${utterances.length} utterances.`);

        // Print the first utterance to see its structure
        console.log("\n--- First Utterance Structure ---");
        const first = utterances[0];
        console.log(`Utterance start: \${first.start}`);
        console.log(`Utterance end: \${first.end}`);
        console.log(`Utterance transcript: \${first.transcript}`);

        console.log("\n--- Searching for 'angry' or 'cancel' ---");
        utterances.forEach((utt) => {
            if (utt.words) {
                utt.words.forEach((w) => {
                    const text = (w.word || w.punctuated_word || "").toLowerCase();
                    if (text.includes("angry") || text.includes("cancel")) {
                        console.log(`Found: "\${text}" at \${w.start}`);
                    }
                });
            }
        });
    } else {
        console.log("No utterances returned!");
        // Check standard channels path
        const firstChannel = result?.results?.channels?.[0]?.alternatives?.[0];
        if (firstChannel && firstChannel.words) {
            console.log("\nFound words array in standard root channel instead.");
            console.log(JSON.stringify(firstChannel.words.slice(0, 5), null, 2));
        }
    }
}

testDeepgram();
