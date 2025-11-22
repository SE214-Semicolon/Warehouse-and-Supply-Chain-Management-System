import * as React from "react";
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  LocalizationProvider,
  DateTimePicker,
  DatePicker,
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
  date: ({ label, value, onChange, sx, ...props }) => (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <DatePicker
        label={label}
        format="dd/MM/yyyy"
        value={value ? new Date(value) : null}
        onChange={(date) => onChange(date)}
        slotProps={{
          textField: {
            fullWidth: true,
            size: "medium",
            sx: { ...focusedStyles, ...sx },
            ...props,
          },
          popper: {
            placement: "bottom-start",
            modifiers: [
              {
                name: "preventOverflow",
                enabled: true,
                options: {
                  boundary: "clippingParents",
                  altAxis: true,
                },
              },
              {
                name: "flip",
                enabled: true,
              },
            ],
          },
        }}
      />
    </LocalizationProvider>
  ),

  datetime: ({ label, value, onChange, sx, ...props }) => (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enUS}>
      <DateTimePicker
        label={label}
        format="dd/MM/yyyy HH:mm"
        value={value ? new Date(value) : null}
        onChange={(date) => onChange(date)}
        slotProps={{
          textField: {
            fullWidth: true,
            size: "medium",
            sx: { ...focusedStyles, ...sx },
            ...props,
          },
          popper: {
            placement: "bottom-start",
            modifiers: [
              {
                name: "preventOverflow",
                enabled: true,
                options: {
                  boundary: "clippingParents",
                  altAxis: true,
                },
              },
              {
                name: "flip",
                enabled: true,
              },
            ],
          },
        }}
      />
    </LocalizationProvider>
  ),

  select: ({ label, value, onChange, options, sx, ...props }) => (
    <FormControl fullWidth size="medium" sx={{ ...focusedStyles, ...sx }}>
      <InputLabel>{label}</InputLabel>
      <Select value={value} onChange={onChange} label={label} {...props}>
        {options.map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  ),

  text: ({ label, value, placeholder, onChange, type, sx, ...props }) => (
    <TextField
      label={label}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      type={type}
      fullWidth
      size="medium"
      sx={{ ...focusedStyles, ...sx }}
      {...props}
    />
  ),
};

export default function FormInput({
  label,
  type = "text",
  value: controlledValue,
  defaultValue = "",
  onChange,
  options = [],
  sx = {},
  ...props
}) {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (controlledValue !== undefined) {
      setValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (eventOrDate) => {
    let newValue;

    if (type === "date" || type === "datetime") {
      newValue = eventOrDate;
    } else {
      newValue = eventOrDate?.target?.value ?? "";
    }

    setValue(newValue);
    onChange?.(newValue);
  };

  const InputComponent = inputComponents[type] || inputComponents.text;

  return (
    <InputComponent
      label={label}
      value={value}
      onChange={handleChange}
      options={options}
      type={type}
      sx={sx}
      {...props}
    />
  );
}
