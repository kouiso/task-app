import { Meta, StoryObj } from '@storybook/react'
import { SelectField } from '.'

export default { component: SelectField } as Meta<typeof SelectField>

export const Parts: StoryObj<typeof SelectField> = {
  args: {
    placeholder: 'テキストを入力できます',
  },
  render: (props) => <SelectField {...props} style={{ width: '300px' }} />,
}
