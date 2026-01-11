import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { withValidation } from "../../../src/api/middleware/validation.js";

const TestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(0, "Age must be positive"),
  email: z.string().email("Invalid email format"),
});

type TestData = z.infer<typeof TestSchema>;

describe("withValidation middleware", () => {
  describe("valid input", () => {
    it("should pass valid input to handler", async () => {
      const validData = {
        name: "John Doe",
        age: 30,
        email: "john@example.com",
      };

      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validData),
      });

      const mockHandler = async (data: TestData): Promise<Response> => {
        expect(data).toEqual(validData);
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(200);

      const responseData = (await response.json()) as { success: boolean };
      expect(responseData.success).toBe(true);
    });
  });

  describe("invalid input", () => {
    it("should return 400 for missing required field", async () => {
      const invalidData = {
        age: 30,
        email: "john@example.com",
        // missing name
      };

      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const mockHandler = async (_data: TestData): Promise<Response> => {
        // Should not be called
        throw new Error("Handler should not be called for invalid data");
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(400);

      const responseData = (await response.json()) as { error: string };
      expect(responseData.error).toContain("Validation error");
      expect(responseData.error).toContain("name");
    });

    it("should return 400 for invalid field type", async () => {
      const invalidData = {
        name: "John Doe",
        age: "thirty", // should be number
        email: "john@example.com",
      };

      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const mockHandler = async (_data: TestData): Promise<Response> => {
        throw new Error("Handler should not be called for invalid data");
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(400);

      const responseData = (await response.json()) as { error: string };
      expect(responseData.error).toContain("Validation error");
      expect(responseData.error).toContain("age");
    });

    it("should return 400 for invalid field format", async () => {
      const invalidData = {
        name: "John Doe",
        age: 30,
        email: "not-an-email", // invalid email format
      };

      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const mockHandler = async (_data: TestData): Promise<Response> => {
        throw new Error("Handler should not be called for invalid data");
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(400);

      const responseData = (await response.json()) as { error: string };
      expect(responseData.error).toContain("Validation error");
      expect(responseData.error).toContain("email");
      expect(responseData.error).toContain("Invalid email format");
    });

    it("should concatenate multiple validation errors", async () => {
      const invalidData = {
        name: "", // too short
        age: -5, // negative
        email: "not-an-email", // invalid format
      };

      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const mockHandler = async (_data: TestData): Promise<Response> => {
        throw new Error("Handler should not be called for invalid data");
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(400);

      const responseData = (await response.json()) as { error: string };
      expect(responseData.error).toContain("Validation error");
      // Should contain all three field errors concatenated
      expect(responseData.error).toContain("name");
      expect(responseData.error).toContain("age");
      expect(responseData.error).toContain("email");
    });
  });

  describe("JSON parse errors", () => {
    it("should return 400 for invalid JSON", async () => {
      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json }",
      });

      const mockHandler = async (_data: TestData): Promise<Response> => {
        throw new Error("Handler should not be called for invalid JSON");
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(400);

      const responseData = (await response.json()) as { error: string };
      expect(responseData.error).toBe("Invalid JSON in request body");
    });
  });

  describe("error format", () => {
    it("should format validation errors consistently with existing format", async () => {
      const invalidData = {
        name: "",
        age: 30,
        email: "john@example.com",
      };

      const request = new Request("http://localhost/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const mockHandler = async (_data: TestData): Promise<Response> => {
        throw new Error("Handler should not be called");
      };

      const response = await withValidation(request, TestSchema, mockHandler);
      expect(response.status).toBe(400);

      const responseData = (await response.json()) as { error: string };
      // Format should be: "Validation error: field: message"
      expect(responseData.error).toMatch(/^Validation error: \w+: .+$/);
    });
  });
});
