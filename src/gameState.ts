import { redis } from "./redis.js";
import { QuestionType, cardCounts, QuestionTypeName } from "./dataLoader.js";
import { SMOQuizError } from "./error.js";

export type SessionId = string | false | undefined;

export class QuizCreationError extends SMOQuizError {}

export async function getShownCards(sessionId: SessionId) {
    const shownCards = await redis.zRange(`${sessionId}-shownCards`, "0", "-1");
    return shownCards.map((id) => +id);
}

export async function updateShownCards(sessionId: SessionId, moonId: number) {
    await redis.zAdd(`${sessionId}-shownCards`, {
        score: moonId,
        value: `${moonId}`,
    });
}

export async function getNumCards(sessionId: SessionId) {
    return Number(await redis.get(`${sessionId}-numCards`));
}

export async function getNumCardsSeen(sessionId: SessionId) {
    return Number(await redis.get(`${sessionId}-numCardsSeen`));
}

export async function incrementNumCardsSeen(sessionId: SessionId) {
    return +(await redis.incr(`${sessionId}-numCardsSeen`));
}

export async function getQuestionTypes(sessionId: SessionId): Promise<QuestionType[]> {
    const questionTypes = await redis.sMembers(`${sessionId}-questionTypes`);
    return questionTypes.map((questionType) => (<any>QuestionType)[questionType]);
}

export async function updateCorrectAnswers(sessionId: SessionId, correct: boolean) {
    if (correct) {
        redis.incr(`${sessionId}-correctAnswers`);
    }
}

export async function getCorrectAnswers(sessionId: SessionId) {
    return +((await redis.get(`${sessionId}-correctAnswers`)) ?? 0);
}

export async function checkSession(sessionId: SessionId) {
    // Time when we first wrote to Redis.
    // Undefined if we haven't stored any sessions yet.
    //
    // Each session id is n,t where n is an increasing number
    // starting at 1 and t is the timestamp of the first
    // call after Redis restarted.
    //
    // The timestamp is used to detect when we restarted Redis
    // and lost all data. In that case we discard any old
    // session ids and regenerate them.
    let timestamp = await redis.get("timestamp");
    if (!timestamp) {
        await redis.set("timestamp", `${new Date().getTime()}`);
        timestamp = await redis.get("timestamp");
    }
    const [left, right, ...rest] = (sessionId || "").split(",");
    if (rest.length > 0 || !left || !right || right !== timestamp) {
        sessionId = undefined;
    }
    if (!sessionId) {
        sessionId = `${await redis.incr("sessionCount")},${timestamp}`;
    }
    return sessionId;
}

export async function createQuiz(
    sessionId: string,
    questionTypes: QuestionTypeName[],
    numCards: number,
) {
    let selectedCardCount = 0;
    for (const questionType of questionTypes) {
        const questionNum = QuestionType[questionType];
        selectedCardCount += cardCounts[questionNum];
    }
    if (selectedCardCount < numCards) {
        throw new QuizCreationError(
            `Please select at most ${selectedCardCount} questions for the chosen question types.`,
        );
    }
    await deleteQuiz(sessionId);
    await Promise.all([
        redis.set(`${sessionId}-numCards`, numCards),
        redis.set(`${sessionId}-numCardsSeen`, 0),
    ]);
    await redis.sAdd(`${sessionId}-questionTypes`, questionTypes);
}

export async function deleteQuiz(sessionId: SessionId) {
    await Promise.all([
        redis.del(`${sessionId}-shownCards`),
        redis.del(`${sessionId}-questionTypes`),
        redis.del(`${sessionId}-numCards`),
        redis.del(`${sessionId}-numCardsSeen`),
        redis.del(`${sessionId}-correctAnswers`),
    ]);
}
