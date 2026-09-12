"use client";

import React, { useState, useEffect, useRef, useEffectEvent } from "react";
import { Header } from "@/components/Header";
import { ReviewerBar } from "@/components/ReviewerBar";
import { Step1Profile } from "@/components/Step1Profile";
import { Step2Age } from "@/components/Step2Age";
import { Step3Measurements } from "@/components/Step3Measurements";
import { Step4Activity } from "@/components/Step4Activity";
import { Step5Calculation } from "@/components/Step5Calculation";
import { Step5Results } from "@/components/Step5Results";
import { MeasuredBackground } from "@/components/MeasuredBackground";
import { ResultData } from "@/components/types";
import { Locale, i18n } from "@/components/i18n";

type FormError = { message: string; target: string };

const PRE_PAID_SESSION_ID = "11111111-2222-4333-8444-555555555555";
const PRE_UNPAID_SESSION_ID = "99999999-8888-4777-8666-555555555555";

export default function HomePage() {
  const [sessionId, setSessionId] = useState<string>("");
  const versionRef = useRef(0);
  const savingRef = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const [step, setStep] = useState<number>(1);
  const [locale, setLocale] = useState<Locale>("zh"); // 默认中文，亦可一键切英文

  // 表单状态
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER" | "">("");
  const [primaryGoal, setPrimaryGoal] = useState<
    "LOSE_WEIGHT" | "MAINTAIN" | "BUILD_MUSCLE" | ""
  >("");
  const [age, setAge] = useState<number | "">(28);
  const [heightCm, setHeightCm] = useState<number | "">(172);
  const [currentWeightKg, setCurrentWeightKg] = useState<number | "">(76);
  const [targetWeightKg, setTargetWeightKg] = useState<number | "">(66);
  const [activityLevel, setActivityLevel] = useState<
    "SEDENTARY" | "LIGHT" | "MODERATE" | "VERY_ACTIVE" | ""
  >("");

  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<FormError | null>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [reviewerOpen, setReviewerOpen] = useState<boolean>(false);

  // Step 5 计算与错误诊断恢复状态
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [canAutoFix, setCanAutoFix] = useState<boolean>(false);
  const isAnimationFinishedRef = useRef<boolean>(false);
  const calcDataRef = useRef<unknown>(null);

  const t = i18n[locale];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showFormError = (message: string, target: string) => {
    setFormError({ message, target });
    showToast(message);
    requestAnimationFrame(() => formErrorRef.current?.focus());
  };

  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
  }, [locale]);
  useEffect(() => {
    const heading = document.querySelector<HTMLElement>("main h1");
    heading?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);

  const toggleLocale = () => {
    const nextLocale: Locale = locale === "zh" ? "en" : "zh";
    setLocale(nextLocale);
    localStorage.setItem("arkon_quiz_locale", nextLocale);
    showToast(
      nextLocale === "zh"
        ? "已切换至中文界面"
        : "Switched to English interface",
    );
  };

  const initOrResumeSession = async (existingId?: string) => {
    try {
      setInitialized(false);
      setSaveStatus("saving");
      const res = await fetch("/api/quiz/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existingId ? { sessionId: existingId } : {}),
      });
      const data = await res.json();
      if (data.success) {
        const sid = data.data.sessionId;
        setSessionId(sid);
        versionRef.current = data.data.version;
        localStorage.setItem("arkon_quiz_session_id", sid);

        if (!data.data.isNew) {
          if (!(await fetchProgress(sid))) return;
        } else {
          setSaveStatus("saved");
        }
        setInitialized(true);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleSetPrimaryGoal = (
    goal: "LOSE_WEIGHT" | "MAINTAIN" | "BUILD_MUSCLE" | "",
  ) => {
    setPrimaryGoal(goal);
    const curW = Number(currentWeightKg) || 76;
    const tgtW = Number(targetWeightKg) || 66;

    if (goal === "BUILD_MUSCLE" && tgtW <= curW) {
      const fixed = Math.max(curW + 4, 80);
      setTargetWeightKg(fixed);
    } else if (goal === "LOSE_WEIGHT" && tgtW >= curW) {
      const fixed = Math.min(curW - 8, 68);
      setTargetWeightKg(fixed);
    } else if (goal === "MAINTAIN") {
      setTargetWeightKg(curW);
    }
  };

  const fetchProgress = async (sid: string) => {
    try {
      const res = await fetch(`/api/quiz/session?sessionId=${sid}`);
      const data = await res.json();
      if (data.success) {
        versionRef.current = data.data.version;
        const answers = data.data.answers;
        if (answers) {
          if (answers.gender) setGender(answers.gender);
          if (answers.primaryGoal) setPrimaryGoal(answers.primaryGoal);
          if (answers.age) setAge(answers.age);
          if (answers.heightCm) setHeightCm(answers.heightCm);
          if (answers.currentWeightKg)
            setCurrentWeightKg(answers.currentWeightKg);
          if (answers.targetWeightKg) setTargetWeightKg(answers.targetWeightKg);
          if (answers.activityLevel) setActivityLevel(answers.activityLevel);
        }

        if (data.data.hasAssessment) {
          if (!(await loadResults(sid))) return false;
          setStep(6);
        } else {
          setStep(Math.min(data.data.currentStep || 1, 4));
        }
        setSaveStatus("saved");
        return true;
      }
    } catch {
      /* Network failure is handled below. */
    }
    setSaveStatus("error");
    return false;
  };

  const syncStepData = async (
    patch: Record<string, unknown>,
  ): Promise<boolean> => {
    if (!sessionId || !initialized || savingRef.current) return false;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/quiz/session", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ ...patch, expectedVersion: versionRef.current }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (res.status === 409) {
          await fetchProgress(sessionId);
          showToast(
            locale === "zh"
              ? "答案已在其他页面更新，已重新加载，请检查后继续。"
              : "Answers changed elsewhere. Saved progress reloaded; review before continuing.",
          );
        } else showToast(data.error?.message || "Save failed. Please retry.");
        setSaveStatus("error");
        return false;
      }
      versionRef.current = data.data.version;
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      showToast(
        locale === "zh"
          ? "保存失败，请检查网络后重试。"
          : "Save failed. Check your connection and retry.",
      );
      return false;
    } finally {
      savingRef.current = false;
    }
  };

  const executeCalculation = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch("/api/quiz/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          sessionId,
          expectedVersion: versionRef.current,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (!(await loadResults(sessionId))) {
          setCalculationError(
            locale === "zh"
              ? "获取结果失败，请重试。"
              : "Could not load results. Please retry.",
          );
          return;
        }
        calcDataRef.current = data.data;
        if (isAnimationFinishedRef.current) {
          setStep(6);
        }
      } else {
        if (res.status === 409) {
          await fetchProgress(sessionId);
          showToast(
            locale === "zh"
              ? "答案已更新，请检查后重新计算。"
              : "Answers changed. Review the saved progress and calculate again.",
          );
          return;
        }
        const details = data.error?.details?.targetWeightKg?._errors?.[0];
        let friendlyMsg = data.error?.message || "Calculation error";
        let autoFixable = false;

        if (details && details.includes("building muscle")) {
          friendlyMsg =
            locale === "zh"
              ? "增肌塑形目标下，目标体重不能小于当前体重。建议设定合理的增肌目标（如高于当前体重）。"
              : "Target weight should not be less than current weight when goal is building muscle.";
          autoFixable = true;
        } else if (details && details.includes("weight loss")) {
          friendlyMsg =
            locale === "zh"
              ? "减重目标下，目标体重必须小于当前体重。"
              : "Target weight must be less than current weight for weight loss goal.";
        } else if (details && details.includes("dangerously low BMI")) {
          friendlyMsg =
            locale === "zh"
              ? "目标体重会导致 BMI 过低 (< 16.0)，请设定更健康的目标。"
              : "Target weight results in a dangerously low BMI (< 16.0). Please choose a healthier goal.";
        }

        setCalculationError(friendlyMsg);
        setCanAutoFix(autoFixable);
        showToast(friendlyMsg);
      }
    } catch {
      const errMsg =
        locale === "zh"
          ? "服务端计算异常，请检查网络或重试"
          : "Server calculation failed, please retry";
      setCalculationError(errMsg);
      setCanAutoFix(false);
      showToast(errMsg);
    }
  };

  const handleAnimationComplete = () => {
    isAnimationFinishedRef.current = true;
    if (calcDataRef.current) {
      setStep(6);
    }
  };

  const handleAutoFixAndRetry = async () => {
    const curW = Number(currentWeightKg) || 76;
    const fixedTarget = Math.max(curW + 4, 80);
    setTargetWeightKg(fixedTarget);
    setCalculationError(null);
    setCanAutoFix(false);
    isAnimationFinishedRef.current = false;
    calcDataRef.current = null;
    if (!(await syncStepData({ targetWeightKg: fixedTarget }))) return;
    executeCalculation();
  };

  const loadResults = async (sid: string) => {
    try {
      const res = await fetch(`/api/quiz/results?sessionId=${sid}`);
      const data = await res.json();
      if (data.success) {
        setResultData(data.data);
        return true;
      }
    } catch {
      showToast(
        locale === "zh" ? "获取评估结果失败" : "Failed to load results",
      );
    }
    return false;
  };

  const handleSimulatePayment = async () => {
    if (!sessionId || savingRef.current) return;
    savingRef.current = true;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, planType: "MONTHLY" }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(t.results.paySuccessToast);
        if (!(await loadResults(sessionId)))
          throw new Error("Could not refresh results");
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
        showToast(data.error?.message || "Payment failed");
      }
    } catch {
      setSaveStatus("error");
      showToast(
        locale === "zh" ? "支付网络请求失败" : "Payment network failed",
      );
    } finally {
      savingRef.current = false;
    }
  };

  const switchToTestSession = async (targetId: string) => {
    setInitialized(false);
    await initOrResumeSession(targetId);
  };

  const copyCurlCommand = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000";
    const curl = `curl -X POST "${origin}/api/pay" \\
  -H "Content-Type: application/json" \\
  -d '{"sessionId": "${sessionId || "YOUR_SESSION_ID"}", "planType": "MONTHLY"}'`;
    navigator.clipboard.writeText(curl);
    setCopyFeedback(true);
    showToast(
      locale === "zh"
        ? "cURL 命令已复制到剪贴板！"
        : "cURL copied to clipboard!",
    );
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleReset = async () => {
    setInitialized(false);
    setSessionId("");
    versionRef.current = 0;
    localStorage.removeItem("arkon_quiz_session_id");
    setGender("");
    setPrimaryGoal("");
    setAge(28);
    setHeightCm(172);
    setCurrentWeightKg(76);
    setTargetWeightKg(66);
    setActivityLevel("");
    setResultData(null);
    setStep(1);
    await initOrResumeSession();
    showToast(
      locale === "zh" ? "已开启全新测评会话" : "Started fresh quiz session",
    );
  };

  const goStep2 = async () => {
    if (!gender || !primaryGoal) {
      showFormError(t.step1.errorSelect, !primaryGoal ? "goal-group" : "sex-group");
      return;
    }
    setFormError(null);
    if (!(await syncStepData({ gender, primaryGoal }))) return;
    setStep(2);
  };

  const goStep3 = async () => {
    if (!age || Number(age) < 14 || Number(age) > 120) {
      showFormError(t.step2.errorAge, "age");
      return;
    }
    setFormError(null);
    if (!(await syncStepData({ age: Number(age) }))) return;
    setStep(3);
  };

  const goStep4 = async () => {
    if (!heightCm || !currentWeightKg || !targetWeightKg) {
      showFormError(
        t.step3.errorIncomplete,
        !heightCm ? "height" : !currentWeightKg ? "weight" : "target",
      );
      return;
    }
    const numH = Number(heightCm);
    const numW = Number(currentWeightKg);
    const numT = Number(targetWeightKg);

    if (primaryGoal === "LOSE_WEIGHT" && numT >= numW) {
      showFormError(t.step3.errorTargetWeight, "target");
      return;
    }
    if (primaryGoal === "MAINTAIN" && numT !== numW) {
      showFormError(
        locale === "zh"
          ? "保持体重时，目标体重需要与当前体重相同。"
          : "For maintenance, target weight must match your current weight.",
        "target",
      );
      return;
    }
    if (primaryGoal === "BUILD_MUSCLE" && numT < numW) {
      showFormError(t.step3.errorTargetWeightMuscle, "target");
      return;
    }
    const targetBmi = numT / Math.pow(numH / 100, 2);
    if (targetBmi < 16.0) {
      showFormError(t.step3.errorTargetWeightLowBmi, "target");
      return;
    }

    if (
      !(await syncStepData({
        heightCm: numH,
        currentWeightKg: numW,
        targetWeightKg: numT,
      }))
    )
      return;
    setFormError(null);
    setStep(4);
  };

  const triggerCalculate = async () => {
    if (!activityLevel) {
      showFormError(t.step4.errorSelect, "activity-group");
      return;
    }

    // 严密的前置合理性校验：避免错误参数进入计算并导致跳回
    const numW = Number(currentWeightKg);
    const numT = Number(targetWeightKg);

    if (primaryGoal === "BUILD_MUSCLE" && numT < numW) {
      showFormError(t.step3.errorTargetWeightMuscle, "target");
      setStep(3);
      return;
    }
    if (primaryGoal === "LOSE_WEIGHT" && numT >= numW) {
      showFormError(t.step3.errorTargetWeight, "target");
      setStep(3);
      return;
    }

    if (!(await syncStepData({ activityLevel }))) return;
    setFormError(null);
    setCalculationError(null);
    setCanAutoFix(false);
    isAnimationFinishedRef.current = false;
    calcDataRef.current = null;
    setStep(5);
    executeCalculation();
  };

  const initializeFromStorage = useEffectEvent(() => {
    const savedLocale = localStorage.getItem("arkon_quiz_locale");
    if (savedLocale === "en" || savedLocale === "zh") setLocale(savedLocale);
    void initOrResumeSession(
      localStorage.getItem("arkon_quiz_session_id") || undefined,
    );
  });
  useEffect(() => {
    const timer = setTimeout(initializeFromStorage, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-shell">
      <MeasuredBackground />
      <Header
        step={step}
        saveStatus={saveStatus}
        reviewerOpen={reviewerOpen}
        onToggleReviewer={() => setReviewerOpen(!reviewerOpen)}
        locale={locale}
        onToggleLocale={toggleLocale}
      />

      {reviewerOpen && (
        <fieldset
          disabled={
            !initialized ||
            saveStatus === "saving" ||
            (step === 5 && !calculationError)
          }
          className="border-0 m-0 p-0 min-w-0"
        >
          <ReviewerBar
            sessionId={sessionId}
            onSwitchPaid={() => switchToTestSession(PRE_PAID_SESSION_ID)}
            onSwitchUnpaid={() => switchToTestSession(PRE_UNPAID_SESSION_ID)}
            onCopyCurl={copyCurlCommand}
            copyFeedback={copyFeedback}
            onReset={handleReset}
            locale={locale}
          />
        </fieldset>
      )}

      <main className="main-content">
        {!initialized && saveStatus === "error" && (
          <button type="button" onClick={() => initOrResumeSession(sessionId || undefined)}>
            重新连接 / Retry connection
          </button>
        )}
        {formError && (
          <div
            ref={formErrorRef}
            className="form-error"
            role="alert"
            tabIndex={-1}
          >
            <strong>{locale === "zh" ? "请检查这项内容" : "Check this item"}</strong>
            <a
              href={`#${formError.target}`}
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(formError.target)?.focus();
              }}
            >
              {formError.message}
            </a>
          </div>
        )}
        <fieldset
          disabled={!initialized || saveStatus === "saving"}
          inert={!initialized || saveStatus === "saving"}
          data-testid="quiz-form"
          className="quiz-form"
          aria-busy={saveStatus === "saving"}
        >
          {step === 1 && (
            <Step1Profile
              gender={gender}
              primaryGoal={primaryGoal}
              onSetGender={(value) => {
                setGender(value);
                setFormError(null);
              }}
              onSetPrimaryGoal={(value) => {
                handleSetPrimaryGoal(value);
                setFormError(null);
              }}
              onNext={goStep2}
              locale={locale}
            />
          )}

          {step === 2 && (
            <Step2Age
              age={age}
            onSetAge={(value) => {
              setAge(value);
              setFormError(null);
            }}
              onBack={() => setStep(1)}
              onNext={goStep3}
              locale={locale}
            />
          )}

          {step === 3 && (
            <Step3Measurements
              heightCm={heightCm}
              currentWeightKg={currentWeightKg}
              targetWeightKg={targetWeightKg}
              primaryGoal={primaryGoal}
              unitSystem={unitSystem}
              onSetHeightCm={(value) => {
                setHeightCm(value);
                setFormError(null);
              }}
              onSetCurrentWeightKg={(value) => {
                setCurrentWeightKg(value);
                setFormError(null);
              }}
              onSetTargetWeightKg={(value) => {
                setTargetWeightKg(value);
                setFormError(null);
              }}
              onSetUnitSystem={setUnitSystem}
              onBack={() => setStep(2)}
              onNext={goStep4}
              locale={locale}
            />
          )}

          {step === 4 && (
            <Step4Activity
              activityLevel={activityLevel}
            onSetActivityLevel={(value) => {
              setActivityLevel(value);
              setFormError(null);
            }}
              onBack={() => setStep(3)}
              onCalculate={triggerCalculate}
              locale={locale}
            />
          )}

          {step === 5 && (
            <Step5Calculation
              locale={locale}
              calculationError={calculationError}
              canAutoFix={canAutoFix}
              onComplete={handleAnimationComplete}
              onRetry={() => {
                setCalculationError(null);
                isAnimationFinishedRef.current = false;
                calcDataRef.current = null;
                executeCalculation();
              }}
              onGoToStep3={() => {
                setCalculationError(null);
                setStep(3);
              }}
              onAutoFixAndRetry={handleAutoFixAndRetry}
            />
          )}

          {step === 6 && resultData && (
            <Step5Results
              resultData={resultData}
              onSimulatePayment={handleSimulatePayment}
              onReset={handleReset}
              locale={locale}
            />
          )}
        </fieldset>
      </main>

      <footer className="site-footer">
        <span>
          arkon ·{" "}
          {locale === "zh"
            ? "从了解自己开始"
            : "Begin with understanding yourself"}
        </span>
        <span>
          {locale === "zh"
            ? "公式估算 · 仅供日常规划参考"
            : "Formula-based estimates · For everyday planning"}
        </span>
      </footer>

      {toastMessage && (
        <div role="status" aria-live="polite" className="toast">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
