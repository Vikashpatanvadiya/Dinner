import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import restaurantsRouter from "./restaurants";
import queueRouter from "./queue";
import menuRouter from "./menu";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(restaurantsRouter);
router.use(queueRouter);
router.use(menuRouter);
router.use(ordersRouter);

export default router;
