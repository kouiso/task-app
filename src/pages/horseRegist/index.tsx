/**
 * 馬匹登録画面
 * @packageDocumentation
 * /horseRegist
 * @file
 */

import styles from './style.module.scss'
import words from 'words/default'
import { TextField } from 'components/presenter/Inputs/TextField'
import { Button } from 'components/presenter/Buttons/Button'
import { DateField } from 'components/presenter/Inputs/DateField'
import { SelectField } from 'components/presenter/Inputs/SelectField'
import { CheckboxField } from 'components/presenter/Inputs/CheckboxField'
/**
 * HorseRegistPageの定義
 */
const HorseRegistPage: React.FC = () => {
  const options: { value: string; label: string }[] = [
    { value: '0', label: 'a' },
  ]
  return (
    <div className={styles.container}>
      <TextField
        placeholder={words.horseNamePlaceHolder}
        className={styles.horseName}
        id='horseName'
        label={words.horseName}
      />
      <div className={styles.containerWeightHeight}>
        <TextField
          placeholder={words.horseWeightPlaceHolder}
          className={styles.horseWeight}
          id='horseWeight'
          label={words.horseWeight}
        />
        <TextField
          placeholder={words.horseHeightPlaceHolder}
          className={styles.horseHeight}
          id='horseHeight'
          label={words.horseHeight}
        />
      </div>
      <div className={styles.containerKind}>
        <CheckboxField label={words.horseHin} id={'hinba'} />
        <CheckboxField label={words.horseBo} id={'boba'} />
        <CheckboxField label={words.horseSen} id={'senba'} />
      </div>
      <DateField
        placeholder={words.birthdayPlaceHolder}
        className={styles.birthday}
        id='birthday'
        label={words.birthday}
      />
      <SelectField
        placeholder={words.kindPlaceHolder}
        className={styles.kind}
        id='kind'
        label={words.kind}
        options={options}
      />
      <Button label={words.login} className={styles.loginBtn} />
    </div>
  )
}

export default HorseRegistPage
