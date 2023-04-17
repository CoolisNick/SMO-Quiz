import {
    deleteQuiz,
    getNumCards,
    getShownCards,
    incrementNumCardsSeen,
    SessionId,
    updateShownCards,
    getQuestionTypes,
    getCorrectAnswers,
} from "./gameState.js";
import {
    dataLoaded,
    moons,
    cards,
    cardCounts,
    QuestionType,
    Card,
    QuestionTypeName,
    scenarios,
} from "./dataLoader.js";

export async function card(sessionId: SessionId) {
    // let moons = [
    //     { Kingdom: "1", Name: "1", Image: "" },
    //     { Kingdom: "2", Name: "2", Image: "" },
    //     { Kingdom: "3", Name: "3", Image: "" },
    // ];
    const shownCards = await getShownCards(sessionId);
    const numCards = await getNumCards(sessionId);
    const numCardsSeen = await incrementNumCardsSeen(sessionId);
    const questionTypes = await getQuestionTypes(sessionId);

    if (numCardsSeen > numCards) {
        const correctAnswers = await getCorrectAnswers(sessionId);
        await deleteQuiz(sessionId);
        return {
            done: true,
            numCards,
            correctAnswers,
        };
    }
    await dataLoaded;

    // Get number of cards that have the wrong question type
    let excludedCardCount = cards.length;
    for (const questionType of questionTypes) {
        excludedCardCount -= cardCounts[questionType];
    }

    // Select a random legal card index
    let randomCardIndex = Math.floor(
        Math.random() * (cards.length - shownCards.length - excludedCardCount),
    );

    let randomCard: Card | undefined = await findCard(
        sessionId,
        questionTypes,
        shownCards,
        randomCardIndex,
    );

    const randomMoon = moons[randomCard.moonId];
    const { question, answer, choices } = getQuestionAndAnswer(randomCard, randomMoon);
    return {
        question,
        answer,
        choices,
        numCards,
        numCardsSeen,
    };
}

function getQuestionAndAnswer(
    randomCard: Card,
    randomMoon: {
        Kingdom: string;
        Name: string;
        "First Scenario": string;
        Image: string;
        "Map Location": string;
    },
) {
    let question: { image?: string; text: string; questionType: QuestionTypeName } = {
        text: "",
        questionType: (<any>QuestionType)[randomCard.questionType],
    };
    let answer: string = "";
    let choices: string[] | undefined;
    switch (randomCard.questionType) {
        case QuestionType.KingdomFromName:
            question.text = `What kingdom is the moon "${randomMoon.Name}" in?`;
            answer = randomMoon.Kingdom;
            break;
        case QuestionType.NameFromImage:
            question.text = "What is this moon's name?";
            question.image = modifyImageURL(randomMoon.Image);
            answer = randomMoon.Name;
            break;
        case QuestionType.MapLocationFromName:
            question.text = `Where is the moon "${randomMoon.Name}" located?`;
            answer = "Wrong";
            break;
        case QuestionType.FirstScenarioFromName:
            question.text = `What is the first scenario that the moon "${randomMoon.Name}" exists in?`;
            answer = randomMoon["First Scenario"];
            choices = getScenarioChoices(randomCard);
            break;
    }
    return { question, answer, choices };
}

// Filter out illegal cards and find the correct card
async function findCard(
    sessionId: SessionId,
    questionTypes: QuestionType[],
    shownCards: number[],
    randomCardIndex: number,
) {
    let shownCardsIndex = 0;
    let seenValidCards = 0;
    let randomCard: Card | undefined;
    for (const [cardIndex, card] of cards.entries()) {
        if (!questionTypes.includes(card.questionType)) {
            continue;
        }
        if (shownCards.length > shownCardsIndex && cardIndex === shownCards[shownCardsIndex]) {
            shownCardsIndex++;
            continue;
        }
        if (seenValidCards++ === randomCardIndex) {
            randomCard = card;
            await updateShownCards(sessionId, cardIndex);
            break;
        }
    }
    if (!randomCard) {
        throw new Error("Unexpected error: Could not find card");
    }
    return randomCard;
}

function modifyImageURL(imageURL: string) {
    const defaultImg = "/images/sillydog.jpeg";
    if (!imageURL) {
        return defaultImg;
    }
    const match = imageURL.match(/https:\/\/drive.google.com\/file\/d\/(.+)\/view\?usp=shar/);
    if (!match) {
        return defaultImg;
    }
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
}

function getScenarioChoices(card: Card) {
    const kingdom = moons[card.moonId].Kingdom;
    return scenarios[kingdom];
}

function shuffleArray(array: any[]) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
    }
    return shuffled;
}
