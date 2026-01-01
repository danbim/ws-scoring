// REST API route handlers for riders and division participants

import type { CreateRiderInput, UpdateRiderInput } from "../../domain/rider/types.js";
import {
  createDivisionParticipantRepository,
  createRiderRepository,
} from "../../infrastructure/repositories/index.js";
import { createErrorResponse, createSuccessResponse } from "../helpers.js";
import { createRiderRequestSchema, updateRiderRequestSchema } from "../schemas.js";

// Helper to format Date to ISO string
function formatDate(date: Date | null): string | null {
  return date ? date.toISOString().split("T")[0] : null;
}

// Helper to parse date strings to Date objects
function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) return null;
  return new Date(dateString);
}

// Riders
export async function handleCreateRider(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = createRiderRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const riderRepository = createRiderRepository();

    const input: CreateRiderInput = {
      firstName: data.firstName,
      lastName: data.lastName,
      country: data.country,
      sailNumber: data.sailNumber ?? null,
      email: data.email ?? null,
      dateOfBirth: parseDate(data.dateOfBirth),
    };

    const rider = await riderRepository.createRider(input);

    return createSuccessResponse({
      id: rider.id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      country: rider.country,
      sailNumber: rider.sailNumber,
      email: rider.email,
      dateOfBirth: formatDate(rider.dateOfBirth),
      deletedAt: rider.deletedAt?.toISOString() ?? null,
      createdAt: rider.createdAt.toISOString(),
      updatedAt: rider.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error creating rider:", error);
    return createErrorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

export async function handleGetRider(riderId: string): Promise<Response> {
  try {
    const riderRepository = createRiderRepository();
    const rider = await riderRepository.getRiderById(riderId);

    if (!rider) {
      return createErrorResponse("Rider not found", 404);
    }

    return createSuccessResponse({
      id: rider.id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      country: rider.country,
      sailNumber: rider.sailNumber,
      email: rider.email,
      dateOfBirth: formatDate(rider.dateOfBirth),
      deletedAt: rider.deletedAt?.toISOString() ?? null,
      createdAt: rider.createdAt.toISOString(),
      updatedAt: rider.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error getting rider:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListRiders(includeDeleted?: boolean): Promise<Response> {
  try {
    const riderRepository = createRiderRepository();
    const riders = await riderRepository.getAllRiders(includeDeleted ?? false);

    return createSuccessResponse({
      riders: riders.map((rider) => ({
        id: rider.id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        country: rider.country,
        sailNumber: rider.sailNumber,
        email: rider.email,
        dateOfBirth: formatDate(rider.dateOfBirth),
        deletedAt: rider.deletedAt?.toISOString() ?? null,
        createdAt: rider.createdAt.toISOString(),
        updatedAt: rider.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing riders:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleUpdateRider(riderId: string, request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const validationResult = updateRiderRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ");
      return createErrorResponse(`Validation error: ${errors}`, 400);
    }

    const data = validationResult.data;
    const riderRepository = createRiderRepository();

    const updates: UpdateRiderInput = {};
    if (data.firstName !== undefined) updates.firstName = data.firstName;
    if (data.lastName !== undefined) updates.lastName = data.lastName;
    if (data.country !== undefined) updates.country = data.country;
    if (data.sailNumber !== undefined) updates.sailNumber = data.sailNumber ?? null;
    if (data.email !== undefined) updates.email = data.email ?? null;
    if (data.dateOfBirth !== undefined) updates.dateOfBirth = parseDate(data.dateOfBirth);

    const rider = await riderRepository.updateRider(riderId, updates);

    return createSuccessResponse({
      id: rider.id,
      firstName: rider.firstName,
      lastName: rider.lastName,
      country: rider.country,
      sailNumber: rider.sailNumber,
      email: rider.email,
      dateOfBirth: formatDate(rider.dateOfBirth),
      deletedAt: rider.deletedAt?.toISOString() ?? null,
      createdAt: rider.createdAt.toISOString(),
      updatedAt: rider.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating rider:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleDeleteRider(riderId: string): Promise<Response> {
  try {
    const riderRepository = createRiderRepository();
    await riderRepository.deleteRider(riderId);

    return createSuccessResponse({ message: "Rider deleted successfully" });
  } catch (error) {
    console.error("Error deleting rider:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

// Division Participants
export async function handleAddDivisionParticipant(
  divisionId: string,
  request: Request
): Promise<Response> {
  try {
    const body = await request.json();
    const riderId = body.riderId;

    if (!riderId || typeof riderId !== "string") {
      return createErrorResponse("riderId is required", 400);
    }

    const participantRepository = createDivisionParticipantRepository();

    // Check if already a participant
    const isParticipant = await participantRepository.isParticipant(divisionId, riderId);
    if (isParticipant) {
      return createErrorResponse("Rider is already a participant in this division", 400);
    }

    const participant = await participantRepository.addParticipant(divisionId, riderId);

    return createSuccessResponse({
      id: participant.id,
      divisionId: participant.divisionId,
      riderId: participant.riderId,
      createdAt: participant.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error adding division participant:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleRemoveDivisionParticipant(
  divisionId: string,
  riderId: string
): Promise<Response> {
  try {
    const participantRepository = createDivisionParticipantRepository();
    await participantRepository.removeParticipant(divisionId, riderId);

    return createSuccessResponse({ message: "Participant removed successfully" });
  } catch (error) {
    console.error("Error removing division participant:", error);
    return createErrorResponse("Internal server error", 500);
  }
}

export async function handleListDivisionParticipants(divisionId: string): Promise<Response> {
  try {
    const participantRepository = createDivisionParticipantRepository();
    const riders = await participantRepository.getParticipantsByDivisionId(divisionId);

    return createSuccessResponse({
      riders: riders.map((rider) => ({
        id: rider.id,
        firstName: rider.firstName,
        lastName: rider.lastName,
        country: rider.country,
        sailNumber: rider.sailNumber,
        email: rider.email,
        dateOfBirth: formatDate(rider.dateOfBirth),
        deletedAt: rider.deletedAt?.toISOString() ?? null,
        createdAt: rider.createdAt.toISOString(),
        updatedAt: rider.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Error listing division participants:", error);
    return createErrorResponse("Internal server error", 500);
  }
}
