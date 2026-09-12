import { describe, it, expect } from 'vitest';
import {
  stepUpdateSchema,
  fullQuizDataSchema,
  paymentSchema,
} from '@/lib/validations/quiz';

describe('Security & Boundary Test: Input Validation & Injection Defense (输入校验与安全防御)', () => {
  describe('1. 字段类型污染与注入防御 (Type Confusion & Injection Defense)', () => {
    it('应拦截字符串注入攻击（如 SQL / XSS 代码放入数值字段）', () => {
      const maliciousPayloads = [
        { age: "'; DROP TABLE UserSession; --" },
        { heightCm: '<script>alert(1)</script>' },
        { currentWeightKg: 'NaN' },
        { targetWeightKg: Infinity },
      ];

      for (const payload of maliciousPayloads) {
        const result = stepUpdateSchema.safeParse(payload);
        expect(result.success).toBe(false);
      }
    });

    it('应拦截超范围越界浮点数与整型溢出', () => {
      // 极大值溢出测试
      expect(stepUpdateSchema.safeParse({ age: 999999 }).success).toBe(false);
      expect(stepUpdateSchema.safeParse({ heightCm: 1e6 }).success).toBe(false);
      expect(stepUpdateSchema.safeParse({ currentWeightKg: -0.0001 }).success).toBe(false);

      // 非整型年龄测试
      expect(stepUpdateSchema.safeParse({ age: 25.5 }).success).toBe(false);
    });

    it('应拦截非法枚举注入', () => {
      expect(stepUpdateSchema.safeParse({ gender: 'ADMIN_SUPERUSER' }).success).toBe(false);
      expect(stepUpdateSchema.safeParse({ primaryGoal: 'DESTROY_METABOLISM' }).success).toBe(false);
      expect(stepUpdateSchema.safeParse({ activityLevel: 'EXTREME_DANGEROUS' }).success).toBe(false);
    });
  });

  describe('2. 空更新与畸形结构拦截 (Malformed Payload Defense)', () => {
    it('空对象提交应被拦截', () => {
      const result = stepUpdateSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('非合法 UUID 格式的 sessionId 在支付时应被拒绝', () => {
      const invalidUuids = [
        'not-a-uuid',
        '12345',
        '"><script>alert(1)</script>',
        '123e4567-e89b-12d3-a456-42661417400Z', // 非法十六进制
      ];

      for (const id of invalidUuids) {
        const result = paymentSchema.safeParse({ sessionId: id });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('3. 全量数据计算前的完整性与合规性 (Full Schema Soundness)', () => {
    it('任意必要字段缺失均不能通过全量计算校验', () => {
      const fullValid = {
        gender: 'MALE' as const,
        age: 28,
        primaryGoal: 'LOSE_WEIGHT' as const,
        heightCm: 175,
        currentWeightKg: 80,
        targetWeightKg: 70,
        activityLevel: 'MODERATE' as const,
      };

      // 逐一剔除字段进行断言
      const keys = Object.keys(fullValid) as (keyof typeof fullValid)[];
      for (const key of keys) {
        const copy = { ...fullValid };
        Reflect.deleteProperty(copy, key);
        const res = fullQuizDataSchema.safeParse(copy);
        expect(res.success).toBe(false);
      }
    });
  });
});
