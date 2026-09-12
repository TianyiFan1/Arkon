import { test, expect, Page } from "@playwright/test";

async function begin(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem("arkon_quiz_locale", "en"),
  );
  await page.goto("/");
  await expect(page.getByTestId("quiz-form")).toBeEnabled();
  await page.getByRole("radio", { name: /Lose weight/ }).click();
  await page.getByRole("radio", { name: "Male", exact: true }).click();
}
async function advance(page: Page) {
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("real browser: saves, reloads progress, calculates and unlocks after payment", async ({
  page,
  request,
}) => {
  await begin(page);
  await advance(page);
  await expect(
    page.getByRole("slider", { name: "How old are you?" }),
  ).toBeVisible();
  await page.getByRole("slider", { name: "How old are you?" }).fill("31");
  await advance(page);
  await expect(
    page.getByText("Your Measurements", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Your Measurements", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("quiz-form")).toBeEnabled();
  const sid = await page.evaluate(() =>
    localStorage.getItem("arkon_quiz_session_id"),
  );
  const progress = await (
    await request.get(`/api/quiz/session?sessionId=${sid}`)
  ).json();
  expect(progress.data.answers.age).toBe(31);
  await advance(page);
  await page.getByRole("radio", { name: /Moderately Active/ }).click();
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(
    page.getByText("Your journal · Preview", { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  const before = await (
    await request.get(`/api/quiz/results?sessionId=${sid}`)
  ).json();
  expect(before.data.protectedData).toEqual({
    projectionCurve: null,
    macroSplit: null,
  });
  await page
    .getByRole("button", { name: /Simulate Payment/ })
    .first()
    .click();
  await expect(page.getByText("Full journal", { exact: true })).toBeVisible();
  const after = await (
    await request.get(`/api/quiz/results?sessionId=${sid}`)
  ).json();
  expect(after.data.protectedData.projectionCurve.length).toBeGreaterThan(1);
  await page.reload();
  await expect(page.getByText("Full journal", { exact: true })).toBeVisible();
});

test("accessible validation: error points to the missing choice and mobile controls remain usable", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("arkon_quiz_locale", "en"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByTestId("quiz-form")).toBeEnabled();

  await page.getByRole("radio", { name: /Lose weight/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const error = page.locator(".form-error");
  await expect(error).toContainText("Please select both your primary goal and gender");
  await expect(error).toBeFocused();

  const errorLink = error.getByRole("link");
  await errorLink.click();
  await expect(page.locator("#sex-group")).toBeFocused();
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await expect(error).toBeHidden();

  const continueBox = await page.getByRole("button", { name: "Continue", exact: true }).boundingBox();
  expect(continueBox?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("maintenance goal: target weight can be edited", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("arkon_quiz_locale", "en"),
  );
  await page.goto("/");
  await expect(page.getByTestId("quiz-form")).toBeEnabled();
  await page.getByRole("radio", { name: /Maintain weight/ }).click();
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await advance(page);
  await advance(page);

  const targetWeight = page.getByRole("spinbutton", { name: /Target weight/ });
  await targetWeight.fill("71");
  await expect(targetWeight).toHaveValue("71");
});

test("first step: measured atmosphere background does not block a goal choice", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("arkon_quiz_locale", "en"),
  );
  await page.emulateMedia({ colorScheme: "light" });
  await page.route("**/api/quiz/session", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          sessionId: "11111111-2222-4333-8444-555555555555",
          version: 0,
          isNew: true,
        },
      }),
    });
  });
  await page.route("**/api/quiz/session", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { version: 1, currentStep: 2 },
      }),
    });
  });
  await page.goto("/");

  const background = page.getByTestId("measured-background");
  await expect(background).toBeVisible();
  await expect(page.locator(".assessment-stage .answer-surface")).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)",
  );
  await page.locator(".assessment-stage .answer-surface").hover({
    position: { x: 280, y: 260 },
  });
  await expect(background.getByTestId("measured-reveal")).toBeVisible();

  await page.getByRole("radio", { name: /Lose weight/ }).click();
  await expect(
    page.getByRole("radio", { name: /Lose weight/ }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("slider", { name: "How old are you?" })).toBeVisible();
  await expect(page.getByTestId("measured-background")).toBeVisible();
});

test("dark theme: keeps the assessment surface readable", async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByTestId("quiz-form")).toBeEnabled();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(33, 28, 42)");
  await expect(page.locator(".primary").first()).toHaveCSS("color", "rgb(255, 255, 255)");
});

test("failed save never advances; retry and duplicate clicks save once", async ({
  page,
}) => {
  await begin(page);
  let writes = 0;
  await page.route("**/api/quiz/session", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    writes++;
    if (writes === 1) return route.abort("failed");
    await new Promise((resolve) => setTimeout(resolve, 300));
    return route.continue();
  });
  await advance(page);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("radio", { name: "Male", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).dblclick();
  await expect(
    page.getByRole("slider", { name: "How old are you?" }),
  ).toBeVisible();
  expect(writes).toBe(2);
});

test("real HTTP: conflicting versions, result invalidation, malformed input and annual price", async ({
  request,
}) => {
  const created = await (
    await request.post("/api/quiz/session", { data: {} })
  ).json();
  const sid = created.data.sessionId;
  const headers = { "x-session-id": sid };
  const data = {
    expectedVersion: 0,
    gender: "MALE",
    primaryGoal: "LOSE_WEIGHT",
    age: 30,
    heightCm: 180,
    currentWeightKg: 85,
    targetWeightKg: 75,
    activityLevel: "LIGHT",
  };
  expect(
    (await request.patch("/api/quiz/session", { headers, data })).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/quiz/calculate", {
        headers,
        data: { expectedVersion: 1 },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.patch("/api/quiz/session", {
        headers,
        data: { expectedVersion: 1, currentWeightKg: 90 },
      })
    ).status(),
  ).toBe(200);
  expect((await request.get("/api/quiz/results", { headers })).status()).toBe(
    404,
  );
  expect(
    (
      await request.patch("/api/quiz/session", {
        headers,
        data: { expectedVersion: 1, currentWeightKg: 80 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.patch("/api/quiz/session", {
        data: "null",
        headers: { ...headers, "Content-Type": "application/json" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/quiz/calculate", {
        headers,
        data: { expectedVersion: 2 },
      })
    ).status(),
  ).toBe(200);
  const payment = await (
    await request.post("/api/pay", {
      data: { sessionId: sid, planType: "ANNUAL" },
    })
  ).json();
  expect(payment.data.transaction.amount).toBe(99.99);
});

test("mobile: keyboard choices, bilingual text, unit conversion and calculation recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await begin(page);
  await page
    .getByRole("radio", { name: "Male", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Female", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await advance(page);
  await advance(page);
  const cm = Number(
    await page.getByRole("spinbutton", { name: /^Height/ }).inputValue(),
  );
  const kg = Number(
    await page
      .getByRole("spinbutton", { name: /^Current weight/ })
      .inputValue(),
  );
  await page.getByRole("button", { name: "in / lb", exact: true }).click();
  expect(
    Number(
      await page.getByRole("spinbutton", { name: /^Height/ }).inputValue(),
    ),
  ).toBeCloseTo(cm / 2.54, 1);
  expect(
    Number(
      await page
        .getByRole("spinbutton", { name: /^Current weight/ })
        .inputValue(),
    ),
  ).toBeCloseTo(kg * 2.2046226218, 1);
  await page.getByRole("button", { name: "cm / kg", exact: true }).click();
  expect(
    Number(
      await page.getByRole("spinbutton", { name: /^Height/ }).inputValue(),
    ),
  ).toBe(cm);
  await page.getByRole("button", { name: "切换中文", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "你的身体数据", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Switch to English", exact: true })
    .click();
  await advance(page);
  await page.getByRole("radio", { name: /Moderately Active/ }).click();
  let calls = 0;
  await page.route("**/api/quiz/calculate", async (route) => {
    calls++;
    if (calls === 1)
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { message: "Temporary calculation failure" },
        }),
      });
    await route.continue();
  });
  await page.getByRole("button", { name: "See my results" }).click();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByText("Your journal · Preview", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
