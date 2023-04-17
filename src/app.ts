import express, { NextFunction } from "express";
import { card } from "./cards.js";
import cookieParser from "cookie-parser";
import cookieSignature from "cookie-signature";
import dotenv from "dotenv";
import { checkSession, createQuiz, deleteQuiz, updateCorrectAnswers } from "./gameState.js";
import { SMOQuizError } from "./error.js";

declare global {
    namespace Express {
        interface Request {
            sessionId: string;
        }
    }
}

const app = express();

dotenv.config();
if (!process.env.COOKIE_SECRET) {
    throw new Error("COOKIE_SECRET environment variable not found.");
}

app.use(express.static("public"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
    try {
        let sessionId;
        try {
            sessionId = cookieSignature.unsign(req.cookies.sessionId, process.env.COOKIE_SECRET!);
        } catch {}
        req.sessionId = await checkSession(sessionId);
        res.cookie(
            "sessionId",
            cookieSignature.sign(`${req.sessionId}`, process.env.COOKIE_SECRET!),
        );
        next();
    } catch (err) {
        next(err);
    }
});

app.get("/card.json", async (req, res, next) => {
    try {
        const questionCard = await card(req.sessionId);
        res.json(questionCard);
    } catch (err) {
        next(err);
    }
});

app.post("/quiz.json", async (req, res, next) => {
    try {
        if (!Array.isArray(req.body.questionTypes)) {
            res.status(400);
            res.json({ error: "Please select at least one question type." });
            return;
        }
        if (isNaN(+req.body.numCards) || +req.body.numCards < 1 || req.body.numCards % 1 !== 0) {
            res.status(400);
            res.json({ error: "Number of questions must be a positive whole number." });
            return;
        }

        try {
            await createQuiz(req.sessionId, req.body.questionTypes, +req.body.numCards);
        } catch (err) {
            if (err instanceof SMOQuizError) {
                res.status(400);
                res.json({ error: err.message });
                return;
            }
            throw err;
        }
        res.json({});
    } catch (err) {
        next(err);
    }
});

app.post("/answer.json", async (req, res, next) => {
    updateCorrectAnswers(req.sessionId, req.body.correct);
    res.json({});
});

app.delete("/quiz.json", async (req, res, next) => {
    try {
        try {
            await deleteQuiz(req.sessionId);
        } catch (err) {
            if (err instanceof SMOQuizError) {
                res.status(400);
                res.json({ error: err.message });
                return;
            }
            throw err;
        }
        res.json({});
    } catch (err) {
        next(err);
    }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }
    if (err) {
        if (err instanceof SMOQuizError) {
            res.status(500).send(err.message);
        } else {
            console.log(err);
            res.status(500).send("Internal error. Try again later.");
        }
        return;
    }
    next();
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server listening on port 3000");
});
