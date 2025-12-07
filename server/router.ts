import { initTRPC } from "@trpc/server";
import { z } from "zod";
import superjson from "superjson";
import { query, queryOne } from "./db";
import type {
  RunDto,
  GetRunResponse,
  NlisExportDto,
  GetAnimalHistoryResponse,
  RunAnimalDto,
} from "../shared/types";

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
      .query(async ({ input }) => {
        let sql = `
          SELECT 
            run_id, site_id, run_type, status, pic, truck_id, lot_number,
            counterparty_name, counterparty_code, notes,
            created_at, updated_at, confirmed_at
          FROM icattle_runs
          WHERE 1=1
        `;
        const params: any[] = [];
        let paramIndex = 1;

        if (input.status) {
          sql += ` AND status = $${paramIndex}`;
          params.push(input.status);
          paramIndex++;
        }

        if (input.runType) {
          sql += ` AND run_type = $${paramIndex}`;
          params.push(input.runType);
          paramIndex++;
        }

        if (input.siteId) {
          sql += ` AND site_id = $${paramIndex}`;
          params.push(input.siteId);
          paramIndex++;
        }

        sql += ` ORDER BY created_at DESC`;

        const offset = input.offset || 0;
        const limit = input.limit || 20;
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        const rows = await query(sql, params);
        const runs: RunDto[] = rows.map((row: any) => ({
          runId: row.run_id,
          siteId: row.site_id,
          runType: row.run_type,
          status: row.status,
          pic: row.pic,
          createdAt: row.created_at.toISOString(),
          metadata: {
            truckId: row.truck_id,
            lotNumber: row.lot_number,
            counterpartyName: row.counterparty_name,
            counterpartyCode: row.counterparty_code,
            notes: row.notes,
          },
        }));

        return {
          runs,
          total: runs.length,
        };
      }),

    // Get single run with animals
    getRun: publicProcedure
      .input(z.object({ runId: z.string() }))
      .query(async ({ input }): Promise<GetRunResponse> => {
        const run = await queryOne<any>(
          `SELECT * FROM icattle_runs WHERE run_id = $1`,
          [input.runId]
        );

        if (!run) throw new Error("Run not found");

        const animals = await query<any>(
          `SELECT * FROM icattle_run_animals WHERE run_id = $1 ORDER BY temp_ref`,
          [input.runId]
        );

        const nlisExport = await queryOne<any>(
          `SELECT * FROM icattle_nlis_exports WHERE run_id = $1`,
          [input.runId]
        );

        const runDto: RunDto = {
          runId: run.run_id,
          siteId: run.site_id,
          runType: run.run_type,
          status: run.status,
          pic: run.pic,
          createdAt: run.created_at.toISOString(),
          metadata: {
            truckId: run.truck_id,
            lotNumber: run.lot_number,
            counterpartyName: run.counterparty_name,
            counterpartyCode: run.counterparty_code,
            notes: run.notes,
          },
        };

        const animalDtos: RunAnimalDto[] = animals.map((a: any) => ({
          tempRef: a.temp_ref,
          animalId: a.animal_id,
          nlisId: a.nlis_id,
          thumbnailUrl: a.thumbnail_url,
          mediaHash: a.media_hash,
          lamenessScore: a.lameness_score ? parseFloat(a.lameness_score) : undefined,
          lamenessClass: a.lameness_class,
          conditionScore: a.condition_score ? parseFloat(a.condition_score) : undefined,
          tickIndex: a.tick_index ? parseFloat(a.tick_index) : undefined,
          flags: a.flags || [],
          modelConfidence: a.model_confidence ? parseFloat(a.model_confidence) : undefined,
          excluded: a.excluded,
          exclusionReason: a.exclusion_reason,
        }));

        return {
          run: runDto,
          animals: animalDtos,
          nlisExport: nlisExport
            ? {
                exportId: nlisExport.export_id,
                runId: nlisExport.run_id,
                siteId: nlisExport.site_id,
                pic: nlisExport.pic,
                status: nlisExport.status,
                fileName: nlisExport.file_name,
                fileUrl: nlisExport.file_url,
                uploadStatus: nlisExport.upload_status,
                generatedAt: nlisExport.generated_at?.toISOString(),
              }
            : undefined,
        };
      }),

    // Exclude animal from run
    excludeAnimal: publicProcedure
      .input(
        z.object({
          runId: z.string(),
          tempRef: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await query(
          `UPDATE icattle_run_animals 
           SET excluded = true, exclusion_reason = $1, updated_at = NOW()
           WHERE run_id = $2 AND temp_ref = $3`,
          [input.reason || null, input.runId, input.tempRef]
        );
        return { success: true };
      }),

    // Set NLIS ID for animal
    setNlisId: publicProcedure
      .input(
        z.object({
          runId: z.string(),
          tempRef: z.string(),
          nlisId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        await query(
          `UPDATE icattle_run_animals 
           SET nlis_id = $1, updated_at = NOW()
           WHERE run_id = $2 AND temp_ref = $3`,
          [input.nlisId, input.runId, input.tempRef]
        );

        const animal = await queryOne<any>(
          `SELECT * FROM icattle_run_animals WHERE run_id = $1 AND temp_ref = $2`,
          [input.runId, input.tempRef]
        );

        return {
          success: true,
          animal: animal
            ? {
                tempRef: animal.temp_ref,
                animalId: animal.animal_id,
                nlisId: animal.nlis_id,
                thumbnailUrl: animal.thumbnail_url,
                mediaHash: animal.media_hash,
                lamenessScore: animal.lameness_score ? parseFloat(animal.lameness_score) : undefined,
                lamenessClass: animal.lameness_class,
                conditionScore: animal.condition_score ? parseFloat(animal.condition_score) : undefined,
                tickIndex: animal.tick_index ? parseFloat(animal.tick_index) : undefined,
                flags: animal.flags || [],
                modelConfidence: animal.model_confidence ? parseFloat(animal.model_confidence) : undefined,
                excluded: animal.excluded,
                exclusionReason: animal.exclusion_reason,
              }
            : undefined,
        };
      }),

    // Confirm run and generate NLIS export
    confirmRun: publicProcedure
      .input(z.object({ runId: z.string() }))
      .mutation(async ({ input }) => {
        // Update run status
        await query(
          `UPDATE icattle_runs 
           SET status = 'CONFIRMED', confirmed_at = NOW(), updated_at = NOW()
           WHERE run_id = $1`,
          [input.runId]
        );

        // Get run details
        const run = await queryOne<any>(
          `SELECT * FROM icattle_runs WHERE run_id = $1`,
          [input.runId]
        );

        if (!run) throw new Error("Run not found");

        // Create NLIS export
        const exportId = `EXP-${input.runId}`;
        await query(
          `INSERT INTO icattle_nlis_exports (export_id, run_id, site_id, pic, status, file_name, file_url, generated_at)
           VALUES ($1, $2, $3, $4, 'READY', $5, $6, NOW())
           ON CONFLICT (export_id) DO UPDATE SET status = 'READY', generated_at = NOW()`,
          [
            exportId,
            input.runId,
            run.site_id,
            run.pic,
            `nlis-${input.runId}.csv`,
            `/api/exports/${input.runId}.csv`,
          ]
        );

        return { success: true, exportId };
      }),

    // Get NLIS export
    getNlisExport: publicProcedure
      .input(z.object({ runId: z.string() }))
      .query(async ({ input }): Promise<NlisExportDto> => {
        const nlisExport = await queryOne<any>(
          `SELECT * FROM icattle_nlis_exports WHERE run_id = $1`,
          [input.runId]
        );

        if (!nlisExport) throw new Error("NLIS export not found");

        return {
          exportId: nlisExport.export_id,
          runId: nlisExport.run_id,
          siteId: nlisExport.site_id,
          pic: nlisExport.pic,
          status: nlisExport.status,
          fileName: nlisExport.file_name,
          fileUrl: nlisExport.file_url,
          uploadStatus: nlisExport.upload_status,
          generatedAt: nlisExport.generated_at?.toISOString(),
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
      .mutation(async ({ input }): Promise<RunDto> => {
        const runId = `RUN-${Date.now()}`;

        // Get site PIC
        const site = await queryOne<any>(
          `SELECT pic FROM icattle_sites WHERE site_id = $1`,
          [input.siteId]
        );

        await query(
          `INSERT INTO icattle_runs (run_id, site_id, run_type, status, pic, truck_id, lot_number, counterparty_name, counterparty_code, notes)
           VALUES ($1, $2, $3, 'DRAFT', $4, $5, $6, $7, $8, $9)`,
          [
            runId,
            input.siteId,
            input.runType,
            site?.pic || "UNKNOWN",
            input.truckId,
            input.lotNumber,
            input.counterpartyName,
            input.counterpartyCode,
            input.notes,
          ]
        );

        return {
          runId,
          siteId: input.siteId,
          runType: input.runType,
          status: "DRAFT",
          pic: site?.pic || "UNKNOWN",
          createdAt: new Date().toISOString(),
          metadata: {
            truckId: input.truckId,
            lotNumber: input.lotNumber,
            counterpartyName: input.counterpartyName,
            counterpartyCode: input.counterpartyCode,
            notes: input.notes,
          },
        };
      }),

    // Start capture (stub)
    startCapture: publicProcedure
      .input(z.object({ runId: z.string() }))
      .mutation(async ({ input }): Promise<RunDto> => {
        await query(
          `UPDATE icattle_runs SET status = 'CAPTURING', updated_at = NOW() WHERE run_id = $1`,
          [input.runId]
        );

        const run = await queryOne<any>(
          `SELECT * FROM icattle_runs WHERE run_id = $1`,
          [input.runId]
        );

        if (!run) throw new Error("Run not found");

        return {
          runId: run.run_id,
          siteId: run.site_id,
          runType: run.run_type,
          status: run.status,
          pic: run.pic,
          createdAt: run.created_at.toISOString(),
          metadata: {
            truckId: run.truck_id,
            lotNumber: run.lot_number,
            counterpartyName: run.counterparty_name,
            counterpartyCode: run.counterparty_code,
            notes: run.notes,
          },
        };
      }),

    // Merge animals (stub)
    mergeAnimals: publicProcedure
      .input(
        z.object({
          runId: z.string(),
          primaryTempRef: z.string(),
          duplicateTempRef: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        // For now, just exclude the duplicate
        await query(
          `UPDATE icattle_run_animals 
           SET excluded = true, exclusion_reason = 'Merged into ' || $1, updated_at = NOW()
           WHERE run_id = $2 AND temp_ref = $3`,
          [input.primaryTempRef, input.runId, input.duplicateTempRef]
        );
        return { success: true };
      }),
  }),

  animals: router({
    // Get animal history
    getHistory: publicProcedure
      .input(z.object({ animalId: z.string() }))
      .query(async ({ input }): Promise<GetAnimalHistoryResponse> => {
        // Try to find by NLIS ID first, then animal ID
        const animal = await queryOne<any>(
          `SELECT * FROM icattle_run_animals WHERE nlis_id = $1 OR animal_id = $1 LIMIT 1`,
          [input.animalId]
        );

        if (!animal) {
          return {
            animalId: input.animalId,
            nlisId: null,
            events: [],
          };
        }

        // Get all events for this animal
        const events = await query<any>(
          `SELECT 
            event_type, occurred_at, run_id, site_id,
            lameness_class, condition_score, tick_index
           FROM icattle_animal_movements
           WHERE animal_id = $1 OR nlis_id = $2
           ORDER BY occurred_at DESC`,
          [animal.animal_id, animal.nlis_id]
        );

        // Get RedBelly proofs
        const proofs = await query<any>(
          `SELECT * FROM icattle_redbelly_commitments
           WHERE entity_id = $1 OR entity_id = $2`,
          [animal.animal_id, animal.nlis_id]
        );

        return {
          animalId: animal.animal_id,
          nlisId: animal.nlis_id,
          events: events.map((e: any) => ({
            eventType: e.event_type,
            occurredAt: e.occurred_at.toISOString(),
            runId: e.run_id,
            siteId: e.site_id,
            lamenessClass: e.lameness_class,
            conditionScore: e.condition_score
              ? parseFloat(e.condition_score)
              : undefined,
            tickIndex: e.tick_index ? parseFloat(e.tick_index) : undefined,
            proof: proofs.find((p: any) => p.entity_id === e.run_id)
              ? {
                  commitmentId: proofs[0].commitment_id,
                  verified: proofs[0].status === "CONFIRMED",
                  txHash: proofs[0].tx_hash,
                  explorerUrl: proofs[0].explorer_url,
                }
              : undefined,
          })),
        };
      }),
  }),

  // PIC Registry
  picRegistry: router({
    // Search PICs
    search: publicProcedure
      .input(
        z.object({
          query: z.string(),
          jurisdiction: z.string().optional(),
          limit: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const limit = input.limit || 20;
        let sql = `
          SELECT 
            pic_code, jurisdiction, property_name, region, lga,
            is_active, has_bmp, source_version_date
          FROM pic_registry
          WHERE (UPPER(pic_code) LIKE UPPER($1) 
                 OR UPPER(property_name) LIKE UPPER($1)
                 OR UPPER(region) LIKE UPPER($1)
                 OR UPPER(lga) LIKE UPPER($1))
        `;
        const params: any[] = [`%${input.query}%`];

        if (input.jurisdiction) {
          sql += ` AND jurisdiction = $2`;
          params.push(input.jurisdiction);
        }

        sql += ` ORDER BY is_active DESC, property_name ASC LIMIT ${limit}`;

        const rows = await query(sql, params);
        return rows.map((row: any) => ({
          picCode: row.pic_code,
          jurisdiction: row.jurisdiction,
          propertyName: row.property_name,
          region: row.region,
          lga: row.lga,
          isActive: row.is_active,
          hasBmp: row.has_bmp,
          sourceVersionDate: row.source_version_date?.toISOString(),
        }));
      }),

    // Get PIC details
    get: publicProcedure
      .input(z.object({ picCode: z.string() }))
      .query(async ({ input }) => {
        const pic = await queryOne<any>(
          `SELECT * FROM pic_registry WHERE pic_code = $1`,
          [input.picCode]
        );

        if (!pic) return null;

        return {
          picCode: pic.pic_code,
          jurisdiction: pic.jurisdiction,
          propertyName: pic.property_name,
          region: pic.region,
          lga: pic.lga,
          isActive: pic.is_active,
          hasBmp: pic.has_bmp,
          sourceVersionDate: pic.source_version_date?.toISOString(),
        };
      }),

    // Get client properties
    getClientProperties: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input }) => {
        const properties = await query<any>(
          `SELECT 
            cp.property_id, cp.tenant_id, cp.pic_code, cp.display_name, cp.status,
            pr.property_name, pr.region, pr.lga, pr.is_active, pr.has_bmp
           FROM client_property cp
           JOIN pic_registry pr ON cp.pic_code = pr.pic_code
           WHERE cp.tenant_id = $1
           ORDER BY cp.display_name`,
          [input.tenantId]
        );

        return properties.map((p: any) => ({
          propertyId: p.property_id,
          tenantId: p.tenant_id,
          picCode: p.pic_code,
          displayName: p.display_name,
          status: p.status,
          propertyName: p.property_name,
          region: p.region,
          lga: p.lga,
          isActive: p.is_active,
          hasBmp: p.has_bmp,
        }));
      }),
  }),
});

export type AppRouter = typeof appRouter;
