import { initTRPC } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";
import type {
  RunDto,
  GetRunResponse,
  NlisExportDto,
  GetAnimalHistoryResponse,
} from "../shared/types";
import {
  stubRuns,
  getStubRun,
  getStubNlisExport,
  getStubAnimalHistory,
  updateAnimalExclusion,
  updateAnimalNlisId,
  confirmRun,
} from "./stubData";

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  ramp: router({
    // List runs with filters
    listRuns: publicProcedure
      .input(
        z.object({
          siteId: z.string().optional(),
          fromDate: z.string().optional(),
          toDate: z.string().optional(),
          status: z
            .enum(["DRAFT", "CAPTURING", "PROCESSING", "REVIEW", "CONFIRMED"])
            .optional(),
          runType: z.enum(["INCOMING", "OUTGOING"]).optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(({ input }) => {
        let filtered = [...stubRuns];

        if (input.status) {
          filtered = filtered.filter((r) => r.status === input.status);
        }
        if (input.runType) {
          filtered = filtered.filter((r) => r.runType === input.runType);
        }
        if (input.siteId) {
          filtered = filtered.filter((r) => r.siteId === input.siteId);
        }

        // Sort by created date descending
        filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Pagination
        const offset = input.offset || 0;
        const limit = input.limit || 20;
        const paginated = filtered.slice(offset, offset + limit);

        return {
          runs: paginated,
          total: filtered.length,
        };
      }),

    // Create new run
    createRun: publicProcedure
      .input(
        z.object({
          siteId: z.string(),
          runType: z.enum(["INCOMING", "OUTGOING"]),
          truckId: z.string().optional(),
          lotNumber: z.string().optional(),
          counterpartyName: z.string().optional(),
          counterpartyCode: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }): RunDto => {
        const runId = `RUN-${String(stubRuns.length + 1).padStart(3, "0")}`;
        const newRun: RunDto = {
          runId,
          siteId: input.siteId,
          runType: input.runType,
          status: "DRAFT",
          pic: "NSW123456", // TODO: Get from site
          createdAt: new Date().toISOString(),
          metadata: {
            truckId: input.truckId,
            lotNumber: input.lotNumber,
            counterpartyName: input.counterpartyName,
            counterpartyCode: input.counterpartyCode,
            notes: input.notes,
          },
        };

        stubRuns.push(newRun);
        return newRun;
      }),

    // Start capture
    startCapture: publicProcedure
      .input(z.object({ runId: z.string() }))
      .mutation(({ input }): RunDto => {
        const run = stubRuns.find((r) => r.runId === input.runId);
        if (!run) throw new Error("Run not found");

        run.status = "CAPTURING";
        return run;
      }),

    // Get run details
    getRun: publicProcedure
      .input(z.object({ runId: z.string() }))
      .query(({ input }): GetRunResponse => {
        const run = getStubRun(input.runId);
        if (!run) throw new Error("Run not found");
        return run;
      }),

    // Exclude animal
    excludeAnimal: publicProcedure
      .input(
        z.object({
          runId: z.string(),
          tempRef: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        updateAnimalExclusion(input.runId, input.tempRef, true);
        return { success: true };
      }),

    // Set NLIS ID
    setNlisId: publicProcedure
      .input(
        z.object({
          runId: z.string(),
          tempRef: z.string(),
          nlisId: z.string(),
        })
      )
      .mutation(({ input }) => {
        updateAnimalNlisId(input.runId, input.tempRef, input.nlisId);
        const run = getStubRun(input.runId);
        const animal = run?.animals.find((a) => a.tempRef === input.tempRef);
        return { success: true, animal };
      }),

    // Merge animals
    mergeAnimals: publicProcedure
      .input(
        z.object({
          runId: z.string(),
          primaryTempRef: z.string(),
          duplicateTempRef: z.string(),
        })
      )
      .mutation(({ input }) => {
        // For stub: just exclude the duplicate
        updateAnimalExclusion(input.runId, input.duplicateTempRef, true);
        return { success: true };
      }),

    // Confirm run
    confirmRun: publicProcedure
      .input(z.object({ runId: z.string() }))
      .mutation(({ input }) => {
        const result = confirmRun(input.runId);
        return result;
      }),

    // Get NLIS export
    getNlisExport: publicProcedure
      .input(z.object({ runId: z.string() }))
      .query(({ input }): NlisExportDto => {
        const nlisExport = getStubNlisExport(input.runId);
        if (!nlisExport) throw new Error("NLIS export not found");
        return nlisExport;
      }),
  }),

  animals: router({
    // Get animal history
    getHistory: publicProcedure
      .input(z.object({ animalId: z.string() }))
      .query(({ input }): GetAnimalHistoryResponse => {
        return getStubAnimalHistory(input.animalId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
