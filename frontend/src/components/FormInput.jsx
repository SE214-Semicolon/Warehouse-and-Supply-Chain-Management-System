import * as React from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import {
  LocalizationProvider,
  DatePicker,
  DateTimePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enUS } from "date-fns/locale";

const focusedStyles = {
  "& label.Mui-focused": { color: "#7F408E" },
  "& .MuiOutlinedInput-root.Mui-focused fieldset": {
    borderColor: "#7F408E",
  },
};

const inputComponents = {
  date: ({
    label,
    value,
    onChange,
    required,
    error,
    helperText,
    disabled,
    sx,
  }) => (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <DatePicker
        label={label}
        format="dd/MM/yyyy"
        value={value ? new Date(value) : null}
        onChange={onChange}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            size: "medium",
            required,
            error,
            helperText,
            sx: { ...focusedStyles, ...sx },
          },
        }}
      />
    </LocalizationProvider>
  ),

  datetime: ({
    label,
    value,
    onChange,
    required,
    error,
    helperText,
    disabled,
    sx,
  }) => (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <DateTimePicker
        label={label}
        format="dd/MM/yyyy HH:mm"
        value={value ? new Date(value) : null}
        onChange={onChange}
        disabled={disabled}
        slotProps={{
          textField: {
            fullWidth: true,
            size: "medium",
            required,
            error,
            helperText,
            sx: { ...focusedStyles, ...sx },
          },
        }}
      />
    </LocalizationProvider>
  ),

  select: ({
    label,
    value,
    onChange,
    options = [],
    required,
    error,
    helperText,
    disabled,
    sx,
  }) => (
    <FormControl
      fullWidth
      size="medium"
      error={error}
      required={required}
      disabled={disabled}
      sx={{ ...focusedStyles, ...sx }}
    >
      <InputLabel>{label}</InputLabel>
      <Select
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        label={label}
      >
        {options.map((opt) => {
          const isObject = typeof opt === "object" && opt !== null;
          const val = isObject ? opt.value : opt;
          const lbl = isObject ? opt.label : opt;
          return (
            <MenuItem key={val} value={val}>
              {lbl}
            </MenuItem>
          );
        })}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  ),

  text: ({
    label,
    value,
    onChange,
    type = "text",
    required,
    error,
    helperText,
    disabled,
    sx,
    ...props
  }) => (
    <TextField
      label={label}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      fullWidth
      size="medium"
      required={required}
      error={error}
      helperText={helperText}
      sx={{ ...focusedStyles, ...sx }}
      {...props}
    />
  ),
};

export default function FormInput({
  label,
  type = "text",
  value: controlledValue,
  onChange,
  options = [],
  required,
  error,
  helperText,
  disabled,
  sx = {},
  ...props
}) {
  const [value, setValue] = React.useState(controlledValue ?? "");

  React.useEffect(() => {
    setValue(controlledValue ?? "");
  }, [controlledValue]);

  const handleChange = (newValue) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  const Component = inputComponents[type] || inputComponents.text;

  return (
    <Component
      label={label}
      value={value}
      onChange={handleChange}
      options={options}
      required={required}
      disabled={disabled}
      type={type}
      error={error}
      helperText={helperText}
      sx={sx}
      {...props}
    />
  );
}
