'use client';

import * as Select from '@radix-ui/react-select';
import { useId } from 'react';

export default function SelectFilter({ label, value, onChange, options }: {
  label: string; value: string; onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return <div className="select-field">
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger id={id} className="select-trigger" aria-labelledby={`${id}-label`}>
        <Select.Value /><Select.Icon aria-hidden="true">⌄</Select.Icon>
      </Select.Trigger>
      <Select.Portal><Select.Content className="select-menu" position="popper" sideOffset={6} collisionPadding={12}>
        <Select.ScrollUpButton className="select-scroll">⌃</Select.ScrollUpButton>
        <Select.Viewport className="select-viewport">{options.map(option => <Select.Item className="select-item" value={option.value} key={option.value}>
          <Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator aria-hidden="true">✓</Select.ItemIndicator>
        </Select.Item>)}</Select.Viewport>
        <Select.ScrollDownButton className="select-scroll">⌄</Select.ScrollDownButton>
      </Select.Content></Select.Portal>
    </Select.Root>
  </div>;
}
