import { ComponentMeta, ComponentStoryObj } from '@storybook/react'
import { PasswordField } from '.'

export default { component: PasswordField } as ComponentMeta<
  typeof PasswordField
>

export const Parts: ComponentStoryObj<typeof PasswordField> = {
  args: {
    placeholder: 'パスワードを入力できます',
  },
  render: (props) => <PasswordField {...props} style={{ width: '300px' }} />,
}
