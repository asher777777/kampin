import sys

with open('src/features/crm/components/CRMFormRenderer.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. evaluateFormula
content = content.replace(
    'const evaluateFormula = (formula: string, data: Record<string, string>) => {',
    'const evaluateFormula = (formula: string, data: Record<string, string>, fields: FormField[]) => {'
)
content = content.replace(
    'const actualKey = Object.keys(data).find(k => k.trim() === cleanFieldName);\n    const rawVal = actualKey ? data[actualKey] : "0";',
    'const fieldIndex = fields.findIndex(f => f.label.trim() === cleanFieldName);\n    const rawVal = fieldIndex !== -1 ? data[String(fieldIndex)] : "0";'
)

# 2. initialData
content = content.replace(
    'config.fields.forEach((field) => {',
    'config.fields.forEach((field, idx) => {'
)
content = content.replace(
    'initialData[field.label] = value;',
    'initialData[String(idx)] = value;'
)

# 3. isFieldVisible
content = content.replace(
    'const currentValue = formData[triggerField.label] || "";',
    'const currentValue = formData[String(field.cond_field_index)] || "";'
)

# 4. handleInputChange
content = content.replace(
    'const handleInputChange = (label: string, value: string) => {',
    'const handleInputChange = (idx: number, value: string) => {\n    const label = String(idx);'
)

# 5. getPaymentAmount
content = content.replace(
    'let valStr = formData[f.label];',
    'let valStr = formData[String(config.fields.indexOf(f))];'
)
content = content.replace(
    'String(evaluateFormula(f.calc_formula || "", formData))',
    'String(evaluateFormula(f.calc_formula || "", formData, config.fields))'
)

# 6. validateCurrentStep & handleSubmit validation
content = content.replace(
    'const val = formData[f.label] || "";',
    'const fIdx = String(config.fields.indexOf(f));\n      const val = formData[fIdx] || "";'
)
content = content.replace(
    'newErrors[f.label] =',
    'newErrors[fIdx] ='
)

# 7. cleanFormData
content = content.replace(
    'cleanFormData[f.label] = formData[f.label] || "";',
    'cleanFormData[f.label] = formData[String(config.fields.indexOf(f))] || "";'
)

# 8. Render loop inputs
content = content.replace(
    'const hasError = !!errors[field.label];',
    'const fIdx = config.fields.indexOf(field);\n                      const hasError = !!errors[String(fIdx)];'
)
content = content.replace(
    'formData[field.label]',
    'formData[String(fIdx)]'
)
content = content.replace(
    'handleInputChange(field.label,',
    'handleInputChange(fIdx,'
)
content = content.replace(
    'name={field.label}',
    'name={String(fIdx)}'
)
content = content.replace(
    'errors[field.label]',
    'errors[String(fIdx)]'
)

with open('src/features/crm/components/CRMFormRenderer.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
