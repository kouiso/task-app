import { Meta, StoryObj } from '@storybook/react'
import { PasswordField } from '.'

export default { component: PasswordField } as Meta<typeof PasswordField>

export const Parts: StoryObj<typeof PasswordField> = {
  args: {
    placeholder: 'パスワードを入力できます',
  },
  render: (props) => <PasswordField {...props} style={{ width: '300px' }} />,
}
