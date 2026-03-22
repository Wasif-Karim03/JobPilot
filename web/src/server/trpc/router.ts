import { createTRPCRouter } from "./init";
import { userRouter } from "./routers/user";
import { settingsRouter } from "./routers/settings";
import { resumeRouter } from "./routers/resume";
import { jobRouter } from "./routers/job";
import { applicationRouter } from "./routers/application";
import { outreachRouter } from "./routers/outreach";
import { gmailRouter } from "./routers/gmail";
import { adminRouter } from "./routers/admin";

export const appRouter = createTRPCRouter({
  user: userRouter,
  settings: settingsRouter,
  resume: resumeRouter,
  job: jobRouter,
  application: applicationRouter,
  outreach: outreachRouter,
  gmail: gmailRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
