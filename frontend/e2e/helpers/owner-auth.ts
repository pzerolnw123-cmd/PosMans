import { expect, test, type Page } from "@playwright/test";

export const ownerCredentials = {
  username: process.env.E2E_OWNER_USERNAME,
  password: process.env.E2E_OWNER_PASSWORD,
  pin: process.env.E2E_OWNER_PIN,
};

export function hasOwnerCredentials() {
  return (
    process.env.E2E_RUN_OWNER_FLOWS === "1" &&
    Boolean(ownerCredentials.username && ownerCredentials.password && ownerCredentials.pin)
  );
}

let ownerStorageState: Awaited<ReturnType<ReturnType<Page["context"]>["storageState"]>> | null = null;

export async function signInOwner(page: Page) {
  if (ownerStorageState) {
    const storageState = ownerStorageState;
    await test.step("restore owner session", async () => {
      await page.context().addCookies(storageState.cookies);
    });
    return;
  }

  await test.step("open frontend origin", async () => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
  });

  await test.step("authenticate owner through API", async () => {
    const result = await page.evaluate(
      async ({ pin, password, username }) => {
        async function readJson(response: Response) {
          return (await response.json().catch(() => null)) as Record<string, unknown> | null;
        }

        const csrfResponse = await fetch("/api/auth/csrf", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const csrfData = await readJson(csrfResponse);
        const csrfToken = typeof csrfData?.csrfToken === "string" ? csrfData.csrfToken : "";

        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({ username, password }),
          credentials: "same-origin",
        });
        const loginData = await readJson(loginResponse);
        if (!loginResponse.ok) {
          return {
            ok: false,
            status: loginResponse.status,
            error: typeof loginData?.error === "string" ? loginData.error : "Owner password authentication failed.",
          };
        }

        const pinEndpoint = loginData?.pinSetupRequired ? "/api/auth/setup-pin" : "/api/auth/verify-pin";
        const pinBody = loginData?.pinSetupRequired ? { pin, confirmPin: pin } : { pin };
        const pinResponse = await fetch(pinEndpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify(pinBody),
          credentials: "same-origin",
        });
        const pinData = await readJson(pinResponse);
        return {
          ok: pinResponse.ok,
          status: pinResponse.status,
          error: typeof pinData?.error === "string" ? pinData.error : pinResponse.ok ? null : "Owner PIN authentication failed.",
        };
      },
      {
        username: ownerCredentials.username || "",
        password: ownerCredentials.password || "",
        pin: ownerCredentials.pin || "",
      },
    );

    expect(result, result.error || "Owner authentication failed.").toMatchObject({ ok: true });
  });

  await test.step("wait for owner workspace", async () => {
    await page.goto("/owner/sales", { waitUntil: "domcontentloaded" });
    await Promise.race([
      expect(page).toHaveURL(/\/owner\/sales/),
      page.getByRole("region", { name: "sales layout" }).waitFor({ state: "visible" }),
      page.getByText("Invalid PIN").waitFor({ state: "visible" }).then(() => {
        throw new Error("E2E_OWNER_PIN does not match the stored PIN for E2E_OWNER_USERNAME.");
      }),
    ]);
  });

  ownerStorageState = await page.context().storageState();
}
