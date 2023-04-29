/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createHorseVitalSigns = /* GraphQL */ `
  mutation CreateHorseVitalSigns(
    $input: CreateHorseVitalSignsInput!
    $condition: ModelHorseVitalSignsConditionInput
  ) {
    createHorseVitalSigns(input: $input, condition: $condition) {
      id
      heart_rate
      respiratory_rate
      body_temperature
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      horse {
        id
        name
        sex
        breed
        weight
        height
        create_dt
        update_dt
        birthday
        color
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        age
        owner {
          nextToken
        }
        createdAt
        updatedAt
        horsesCreaterId
        horsesUpdaterId
      }
      createdAt
      updatedAt
      horseVitalSignsCreaterId
      horseVitalSignsUpdaterId
      horseVitalSignsHorseId
    }
  }
`;
export const updateHorseVitalSigns = /* GraphQL */ `
  mutation UpdateHorseVitalSigns(
    $input: UpdateHorseVitalSignsInput!
    $condition: ModelHorseVitalSignsConditionInput
  ) {
    updateHorseVitalSigns(input: $input, condition: $condition) {
      id
      heart_rate
      respiratory_rate
      body_temperature
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      horse {
        id
        name
        sex
        breed
        weight
        height
        create_dt
        update_dt
        birthday
        color
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        age
        owner {
          nextToken
        }
        createdAt
        updatedAt
        horsesCreaterId
        horsesUpdaterId
      }
      createdAt
      updatedAt
      horseVitalSignsCreaterId
      horseVitalSignsUpdaterId
      horseVitalSignsHorseId
    }
  }
`;
export const deleteHorseVitalSigns = /* GraphQL */ `
  mutation DeleteHorseVitalSigns(
    $input: DeleteHorseVitalSignsInput!
    $condition: ModelHorseVitalSignsConditionInput
  ) {
    deleteHorseVitalSigns(input: $input, condition: $condition) {
      id
      heart_rate
      respiratory_rate
      body_temperature
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      horse {
        id
        name
        sex
        breed
        weight
        height
        create_dt
        update_dt
        birthday
        color
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        age
        owner {
          nextToken
        }
        createdAt
        updatedAt
        horsesCreaterId
        horsesUpdaterId
      }
      createdAt
      updatedAt
      horseVitalSignsCreaterId
      horseVitalSignsUpdaterId
      horseVitalSignsHorseId
    }
  }
`;
export const createHorseExercises = /* GraphQL */ `
  mutation CreateHorseExercises(
    $input: CreateHorseExercisesInput!
    $condition: ModelHorseExercisesConditionInput
  ) {
    createHorseExercises(input: $input, condition: $condition) {
      id
      exercise_type
      start_dt
      end_dt
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      rider {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      passtime
      createdAt
      updatedAt
      horseExercisesCreaterId
      horseExercisesUpdaterId
      horseExercisesRiderId
    }
  }
`;
export const updateHorseExercises = /* GraphQL */ `
  mutation UpdateHorseExercises(
    $input: UpdateHorseExercisesInput!
    $condition: ModelHorseExercisesConditionInput
  ) {
    updateHorseExercises(input: $input, condition: $condition) {
      id
      exercise_type
      start_dt
      end_dt
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      rider {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      passtime
      createdAt
      updatedAt
      horseExercisesCreaterId
      horseExercisesUpdaterId
      horseExercisesRiderId
    }
  }
`;
export const deleteHorseExercises = /* GraphQL */ `
  mutation DeleteHorseExercises(
    $input: DeleteHorseExercisesInput!
    $condition: ModelHorseExercisesConditionInput
  ) {
    deleteHorseExercises(input: $input, condition: $condition) {
      id
      exercise_type
      start_dt
      end_dt
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      rider {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      passtime
      createdAt
      updatedAt
      horseExercisesCreaterId
      horseExercisesUpdaterId
      horseExercisesRiderId
    }
  }
`;
export const createUsers = /* GraphQL */ `
  mutation CreateUsers(
    $input: CreateUsersInput!
    $condition: ModelUsersConditionInput
  ) {
    createUsers(input: $input, condition: $condition) {
      id
      name
      kind
      birthday
      create_dt
      update_dt
      creater
      updater
      age
      horsesID
      createdAt
      updatedAt
    }
  }
`;
export const updateUsers = /* GraphQL */ `
  mutation UpdateUsers(
    $input: UpdateUsersInput!
    $condition: ModelUsersConditionInput
  ) {
    updateUsers(input: $input, condition: $condition) {
      id
      name
      kind
      birthday
      create_dt
      update_dt
      creater
      updater
      age
      horsesID
      createdAt
      updatedAt
    }
  }
`;
export const deleteUsers = /* GraphQL */ `
  mutation DeleteUsers(
    $input: DeleteUsersInput!
    $condition: ModelUsersConditionInput
  ) {
    deleteUsers(input: $input, condition: $condition) {
      id
      name
      kind
      birthday
      create_dt
      update_dt
      creater
      updater
      age
      horsesID
      createdAt
      updatedAt
    }
  }
`;
export const createHorseFeedIntakes = /* GraphQL */ `
  mutation CreateHorseFeedIntakes(
    $input: CreateHorseFeedIntakesInput!
    $condition: ModelHorseFeedIntakesConditionInput
  ) {
    createHorseFeedIntakes(input: $input, condition: $condition) {
      id
      create_dt
      update_dt
      amount
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      horse {
        id
        name
        sex
        breed
        weight
        height
        create_dt
        update_dt
        birthday
        color
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        age
        owner {
          nextToken
        }
        createdAt
        updatedAt
        horsesCreaterId
        horsesUpdaterId
      }
      feed {
        id
        name
        create_dt
        update_dt
        amount
        feed_type
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
        feedsCreaterId
        feedsUpdaterId
      }
      intakes_dt
      createdAt
      updatedAt
      horseFeedIntakesCreaterId
      horseFeedIntakesUpdaterId
      horseFeedIntakesHorseId
      horseFeedIntakesFeedId
    }
  }
`;
export const updateHorseFeedIntakes = /* GraphQL */ `
  mutation UpdateHorseFeedIntakes(
    $input: UpdateHorseFeedIntakesInput!
    $condition: ModelHorseFeedIntakesConditionInput
  ) {
    updateHorseFeedIntakes(input: $input, condition: $condition) {
      id
      create_dt
      update_dt
      amount
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      horse {
        id
        name
        sex
        breed
        weight
        height
        create_dt
        update_dt
        birthday
        color
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        age
        owner {
          nextToken
        }
        createdAt
        updatedAt
        horsesCreaterId
        horsesUpdaterId
      }
      feed {
        id
        name
        create_dt
        update_dt
        amount
        feed_type
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
        feedsCreaterId
        feedsUpdaterId
      }
      intakes_dt
      createdAt
      updatedAt
      horseFeedIntakesCreaterId
      horseFeedIntakesUpdaterId
      horseFeedIntakesHorseId
      horseFeedIntakesFeedId
    }
  }
`;
export const deleteHorseFeedIntakes = /* GraphQL */ `
  mutation DeleteHorseFeedIntakes(
    $input: DeleteHorseFeedIntakesInput!
    $condition: ModelHorseFeedIntakesConditionInput
  ) {
    deleteHorseFeedIntakes(input: $input, condition: $condition) {
      id
      create_dt
      update_dt
      amount
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      horse {
        id
        name
        sex
        breed
        weight
        height
        create_dt
        update_dt
        birthday
        color
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        age
        owner {
          nextToken
        }
        createdAt
        updatedAt
        horsesCreaterId
        horsesUpdaterId
      }
      feed {
        id
        name
        create_dt
        update_dt
        amount
        feed_type
        creater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        updater {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        createdAt
        updatedAt
        feedsCreaterId
        feedsUpdaterId
      }
      intakes_dt
      createdAt
      updatedAt
      horseFeedIntakesCreaterId
      horseFeedIntakesUpdaterId
      horseFeedIntakesHorseId
      horseFeedIntakesFeedId
    }
  }
`;
export const createHorseWaterIntakes = /* GraphQL */ `
  mutation CreateHorseWaterIntakes(
    $input: CreateHorseWaterIntakesInput!
    $condition: ModelHorseWaterIntakesConditionInput
  ) {
    createHorseWaterIntakes(input: $input, condition: $condition) {
      id
      amount
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      intakes_dt
      createdAt
      updatedAt
      horseWaterIntakesCreaterId
      horseWaterIntakesUpdaterId
    }
  }
`;
export const updateHorseWaterIntakes = /* GraphQL */ `
  mutation UpdateHorseWaterIntakes(
    $input: UpdateHorseWaterIntakesInput!
    $condition: ModelHorseWaterIntakesConditionInput
  ) {
    updateHorseWaterIntakes(input: $input, condition: $condition) {
      id
      amount
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      intakes_dt
      createdAt
      updatedAt
      horseWaterIntakesCreaterId
      horseWaterIntakesUpdaterId
    }
  }
`;
export const deleteHorseWaterIntakes = /* GraphQL */ `
  mutation DeleteHorseWaterIntakes(
    $input: DeleteHorseWaterIntakesInput!
    $condition: ModelHorseWaterIntakesConditionInput
  ) {
    deleteHorseWaterIntakes(input: $input, condition: $condition) {
      id
      amount
      create_dt
      update_dt
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      intakes_dt
      createdAt
      updatedAt
      horseWaterIntakesCreaterId
      horseWaterIntakesUpdaterId
    }
  }
`;
export const createFeeds = /* GraphQL */ `
  mutation CreateFeeds(
    $input: CreateFeedsInput!
    $condition: ModelFeedsConditionInput
  ) {
    createFeeds(input: $input, condition: $condition) {
      id
      name
      create_dt
      update_dt
      amount
      feed_type
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      feedsCreaterId
      feedsUpdaterId
    }
  }
`;
export const updateFeeds = /* GraphQL */ `
  mutation UpdateFeeds(
    $input: UpdateFeedsInput!
    $condition: ModelFeedsConditionInput
  ) {
    updateFeeds(input: $input, condition: $condition) {
      id
      name
      create_dt
      update_dt
      amount
      feed_type
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      feedsCreaterId
      feedsUpdaterId
    }
  }
`;
export const deleteFeeds = /* GraphQL */ `
  mutation DeleteFeeds(
    $input: DeleteFeedsInput!
    $condition: ModelFeedsConditionInput
  ) {
    deleteFeeds(input: $input, condition: $condition) {
      id
      name
      create_dt
      update_dt
      amount
      feed_type
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      feedsCreaterId
      feedsUpdaterId
    }
  }
`;
export const createHorses = /* GraphQL */ `
  mutation CreateHorses(
    $input: CreateHorsesInput!
    $condition: ModelHorsesConditionInput
  ) {
    createHorses(input: $input, condition: $condition) {
      id
      name
      sex
      breed
      weight
      height
      create_dt
      update_dt
      birthday
      color
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      age
      owner {
        items {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        nextToken
      }
      createdAt
      updatedAt
      horsesCreaterId
      horsesUpdaterId
    }
  }
`;
export const updateHorses = /* GraphQL */ `
  mutation UpdateHorses(
    $input: UpdateHorsesInput!
    $condition: ModelHorsesConditionInput
  ) {
    updateHorses(input: $input, condition: $condition) {
      id
      name
      sex
      breed
      weight
      height
      create_dt
      update_dt
      birthday
      color
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      age
      owner {
        items {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        nextToken
      }
      createdAt
      updatedAt
      horsesCreaterId
      horsesUpdaterId
    }
  }
`;
export const deleteHorses = /* GraphQL */ `
  mutation DeleteHorses(
    $input: DeleteHorsesInput!
    $condition: ModelHorsesConditionInput
  ) {
    deleteHorses(input: $input, condition: $condition) {
      id
      name
      sex
      breed
      weight
      height
      create_dt
      update_dt
      birthday
      color
      creater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      updater {
        id
        name
        kind
        birthday
        create_dt
        update_dt
        creater
        updater
        age
        horsesID
        createdAt
        updatedAt
      }
      age
      owner {
        items {
          id
          name
          kind
          birthday
          create_dt
          update_dt
          creater
          updater
          age
          horsesID
          createdAt
          updatedAt
        }
        nextToken
      }
      createdAt
      updatedAt
      horsesCreaterId
      horsesUpdaterId
    }
  }
`;
