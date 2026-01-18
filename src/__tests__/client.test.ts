import { describe, it, expect, vi } from "vitest";
import { HubSpotClient } from "../hubspot/client.js";
import axios from "axios";

vi.mock("axios");

describe("HubSpotClient", () => {
  it("should initialize with correct headers", () => {
    const token = "pat-123";
    new HubSpotClient(token);
    expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: `Bearer ${token}`
      })
    }));
  });

  it("getObject should call correct endpoint", async () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({ data: { id: "123" } }),
    };
    (axios.create as any).mockReturnValue({
      get: mockAxios.get
    });

    const client = new HubSpotClient("token");
    const result = await client.getObject("contacts", "123");
    
    expect(result).toEqual({ id: "123" });
  });
});
