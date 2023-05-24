import { Meta, StoryObj } from '@storybook/react'
import { CheckboxField } from '.'

export default { component: CheckboxField } as Meta<typeof CheckboxField>

export const Parts: StoryObj<typeof CheckboxField> = {
  args: {
    label: 'こちらをチェックできます',
  },
}
