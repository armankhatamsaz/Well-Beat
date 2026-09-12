import { z } from 'zod';

/**
 * Client-side runtime schema validation for the risk assessment payload.
 *
 * These bounds mirror RiskInputSchema in main.py exactly. They are the same
 * numbers the server enforces with Pydantic, restated here so that implausible
 * data is caught in the browser before a request is sent.
 *
 * This layer is an ADDITION, never a replacement. The server still validates
 * every request and still answers 422 for anything out of range. A browser can
 * be bypassed; the API cannot.
 *
 * If a bound changes in main.py, change it here in the same commit.
 */

export const FIELD_LIMITS = {
    age: { min: 20, max: 100, label: 'Age', unit: '' },
    height: { min: 50, max: 250, label: 'Height', unit: ' cm' },
    weight: { min: 11, max: 300, label: 'Weight', unit: ' kg' },
    systolic_bp: { min: 60, max: 250, label: 'Systolic blood pressure', unit: ' mmHg' },
    ldl: { min: 10, max: 500, label: 'LDL cholesterol', unit: ' mg/dL' },
    hdl: { min: 5, max: 150, label: 'HDL cholesterol', unit: ' mg/dL' },
};

const rangeMessage = (key) => {
    const f = FIELD_LIMITS[key];
    return `${f.label} must be between ${f.min} and ${f.max}${f.unit}.`;
};

const numeric = (key, { integer }) => {
    const f = FIELD_LIMITS[key];
    let schema = z.number({ error: `${f.label} must be a number.` });
    if (integer) {
        schema = schema.int(`${f.label} must be a whole number.`);
    }
    return schema.min(f.min, rangeMessage(key)).max(f.max, rangeMessage(key));
};

/**
 * The exact shape POST /risk/static expects.
 *
 * user_id carries a bound that Pydantic does not have. The column is a
 * PostgreSQL integer, so a value above 2147483647 passes Pydantic and then
 * fails on INSERT, which surfaces to the user as HTTP 500 rather than 422.
 * generateUserId already keeps the value inside this range, so the bound can
 * never reject a legitimate request. It is a guard, not a restriction.
 */
export const riskInputSchema = z.object({
    user_id: z
        .number({ error: 'User id must be a number.' })
        .int('User id must be a whole number.')
        .min(1, 'User id is out of range.')
        .max(2147483647, 'User id is out of range.'),
    age: numeric('age', { integer: true }),
    gender: z.string().min(1, 'Please choose a gender.'),
    height: numeric('height', { integer: false }),
    weight: numeric('weight', { integer: false }),
    smoker: z.boolean(),
    systolic_bp: numeric('systolic_bp', { integer: true }),
    ldl: numeric('ldl', { integer: true }),
    hdl: numeric('hdl', { integer: true }),
    diabetes: z.boolean(),
    family_history: z.boolean(),
    arrhythmia: z.boolean(),
    high_pollution_exposure: z.boolean(),
});

/** Payload field name -> the form state key that renders it. */
export const PAYLOAD_TO_FORM_FIELD = {
    age: 'age',
    gender: 'gender',
    height: 'height',
    weight: 'weight',
    systolic_bp: 'sbp',
    ldl: 'ldl',
    hdl: 'hdl',
    smoker: 'smoker',
    diabetes: 'diabetes',
    family_history: 'familyHistory',
    arrhythmia: 'arrhythmia',
    high_pollution_exposure: 'highPollution',
};

/**
 * Validate a payload.
 *
 * Returns { success, data, fieldErrors, formErrors }. fieldErrors is keyed by
 * payload field name, formErrors by form state key, so a component can look up
 * a message with the same name it uses for the input.
 *
 * Nothing here logs a value. Only field names ever leave this function, because
 * the values are health data.
 */
export const validateRiskInput = (payload) => runValidation(riskInputSchema, payload);

/**
 * The same medical bounds without user_id, for validating what the form holds.
 * The form does not know the user id; the store adds it, and the store validates
 * the complete payload again with riskInputSchema before the request goes out.
 */
export const riskFormSchema = riskInputSchema.omit({ user_id: true });

export const validateRiskForm = (values) => runValidation(riskFormSchema, values);

const runValidation = (schema, value) => {
    const result = schema.safeParse(value);
    if (result.success) {
        return { success: true, data: result.data, fieldErrors: {}, formErrors: {} };
    }

    const fieldErrors = {};
    for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (key !== undefined && fieldErrors[key] === undefined) {
            fieldErrors[key] = issue.message;
        }
    }

    const formErrors = {};
    for (const [payloadKey, message] of Object.entries(fieldErrors)) {
        formErrors[PAYLOAD_TO_FORM_FIELD[payloadKey] || payloadKey] = message;
    }

    return { success: false, data: null, fieldErrors, formErrors };
};

/** Field names that failed, safe to log. Never returns a value. */
export const invalidFieldNames = (fieldErrors) => Object.keys(fieldErrors).sort();
