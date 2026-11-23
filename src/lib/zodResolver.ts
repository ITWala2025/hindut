import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers'
import type { Resolver } from 'react-hook-form'
import type { z } from 'zod'

/**
 * Custom zodResolver supporting both Zod v4 (which uses `error.issues`)
 * and Zod v3 (which used `error.errors`).
 * Standard `@hookform/resolvers/zod` checks `Array.isArray(error.errors)`
 * which evaluates to false on Zod v4, throwing uncaught ZodError promises
 * during form field validation (e.g. checkbox onCheckedChange).
 */
export function zodResolver<T extends z.ZodType<any, any, any>>(
  schema: T,
  schemaOptions?: Parameters<T['parseAsync']>[1],
  resolverOptions?: { mode?: 'async' | 'sync'; raw?: boolean },
): Resolver<z.infer<T>> {
  return async (values, _context, options) => {
    try {
      const data = await schema.parseAsync(values, schemaOptions)
      if (options?.shouldUseNativeValidation) {
        validateFieldsNatively({}, options)
      }
      return {
        values: resolverOptions?.raw ? Object.assign({}, values) : data,
        errors: {},
      }
    } catch (error: any) {
      const issues = Array.isArray(error?.issues)
        ? error.issues
        : Array.isArray(error?.errors)
        ? error.errors
        : null

      if (issues) {
        const flatErrors: Record<string, { message: string; type: string }> = {}
        for (const issue of issues) {
          const path = Array.isArray(issue.path) ? issue.path.join('.') : String(issue.path ?? '')
          if (!flatErrors[path]) {
            flatErrors[path] = {
              message: issue.message || 'Invalid value',
              type: issue.code || 'custom',
            }
          }
        }
        return {
          values: {} as any,
          errors: toNestErrors(flatErrors, options),
        }
      }
      throw error
    }
  }
}
