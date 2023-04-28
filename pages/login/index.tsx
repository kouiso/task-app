/**
 * ログイン画面
 * @packageDocumentation
 * /login
 * @file
 */

import styles from './style.module.scss'
import words from '../../words/default'
import useController from '../../controllers/login/controller'
import { TextField } from '../../components/presenter/Inputs/TextField'
import { TextLink } from '../../components/presenter/Links/TextLink'
import { TextLabel } from '../../components/presenter/Labels/TextLabel'
import { Button } from '../../components/presenter/Buttons/Button'
import { GoogleButton } from '../../components/presenter/Buttons/GoogleButton'
import { PasswordField } from '../../components/presenter/Inputs/PasswordField'
import { CheckboxField } from '../../components/presenter/Inputs/CheckboxField'

/**
 * LoginPageの定義
 */
const LoginPage: React.FC = () => {
  const { handleLogin } = useController()

  return (
    <div className={styles.container}>
      <TextLabel className={styles.title} label={words.login} />
      <TextLabel className={styles.message} label={words.pleaseLogin} />
      <GoogleButton className={styles.googleBtn} />
      <TextLabel className={styles.message} label={words.or} />
      <TextField placeholder={words.email} className={styles.email} />
      <PasswordField placeholder={words.password} className={styles.password} />
      <CheckboxField label={words.remember} className={styles.remember} />
      <TextLink className={styles.forgot} label={words.forgot} />
      <Button
        label={words.login}
        className={styles.loginBtn}
        onClick={handleLogin}
      />
      <TextLabel className={styles.noAccount} label={words.noAccount} />
      <TextLink className={styles.here} label={words.here} />
    </div>
  )
}

export default LoginPage
