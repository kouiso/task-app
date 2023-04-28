import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { CheckboxField } from '.'

export default { component: CheckboxField } as ComponentMeta<
  typeof CheckboxField
>

export const parts: ComponentStoryObj<typeof CheckboxField> = {
  args: {
    label: 'こちらをチェックできます',
  },
}
