/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateHorseVitalSigns = /* GraphQL */ `
  subscription OnCreateHorseVitalSigns(
    $filter: ModelSubscriptionHorseVitalSignsFilterInput
  ) {
    onCreateHorseVitalSigns(filter: $filter) {
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
export const onUpdateHorseVitalSigns = /* GraphQL */ `
  subscription OnUpdateHorseVitalSigns(
    $filter: ModelSubscriptionHorseVitalSignsFilterInput
  ) {
    onUpdateHorseVitalSigns(filter: $filter) {
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
export const onDeleteHorseVitalSigns = /* GraphQL */ `
  subscription OnDeleteHorseVitalSigns(
    $filter: ModelSubscriptionHorseVitalSignsFilterInput
  ) {
    onDeleteHorseVitalSigns(filter: $filter) {
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
export const onCreateHorseExercises = /* GraphQL */ `
  subscription OnCreateHorseExercises(
    $filter: ModelSubscriptionHorseExercisesFilterInput
  ) {
    onCreateHorseExercises(filter: $filter) {
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
export const onUpdateHorseExercises = /* GraphQL */ `
  subscription OnUpdateHorseExercises(
    $filter: ModelSubscriptionHorseExercisesFilterInput
  ) {
    onUpdateHorseExercises(filter: $filter) {
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
export const onDeleteHorseExercises = /* GraphQL */ `
  subscription OnDeleteHorseExercises(
    $filter: ModelSubscriptionHorseExercisesFilterInput
  ) {
    onDeleteHorseExercises(filter: $filter) {
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
export const onCreateUsers = /* GraphQL */ `
  subscription OnCreateUsers($filter: ModelSubscriptionUsersFilterInput) {
    onCreateUsers(filter: $filter) {
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
export const onUpdateUsers = /* GraphQL */ `
  subscription OnUpdateUsers($filter: ModelSubscriptionUsersFilterInput) {
    onUpdateUsers(filter: $filter) {
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
export const onDeleteUsers = /* GraphQL */ `
  subscription OnDeleteUsers($filter: ModelSubscriptionUsersFilterInput) {
    onDeleteUsers(filter: $filter) {
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
export const onCreateHorseFeedIntakes = /* GraphQL */ `
  subscription OnCreateHorseFeedIntakes(
    $filter: ModelSubscriptionHorseFeedIntakesFilterInput
  ) {
    onCreateHorseFeedIntakes(filter: $filter) {
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
export const onUpdateHorseFeedIntakes = /* GraphQL */ `
  subscription OnUpdateHorseFeedIntakes(
    $filter: ModelSubscriptionHorseFeedIntakesFilterInput
  ) {
    onUpdateHorseFeedIntakes(filter: $filter) {
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
export const onDeleteHorseFeedIntakes = /* GraphQL */ `
  subscription OnDeleteHorseFeedIntakes(
    $filter: ModelSubscriptionHorseFeedIntakesFilterInput
  ) {
    onDeleteHorseFeedIntakes(filter: $filter) {
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
export const onCreateHorseWaterIntakes = /* GraphQL */ `
  subscription OnCreateHorseWaterIntakes(
    $filter: ModelSubscriptionHorseWaterIntakesFilterInput
  ) {
    onCreateHorseWaterIntakes(filter: $filter) {
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
export const onUpdateHorseWaterIntakes = /* GraphQL */ `
  subscription OnUpdateHorseWaterIntakes(
    $filter: ModelSubscriptionHorseWaterIntakesFilterInput
  ) {
    onUpdateHorseWaterIntakes(filter: $filter) {
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
export const onDeleteHorseWaterIntakes = /* GraphQL */ `
  subscription OnDeleteHorseWaterIntakes(
    $filter: ModelSubscriptionHorseWaterIntakesFilterInput
  ) {
    onDeleteHorseWaterIntakes(filter: $filter) {
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
export const onCreateFeeds = /* GraphQL */ `
  subscription OnCreateFeeds($filter: ModelSubscriptionFeedsFilterInput) {
    onCreateFeeds(filter: $filter) {
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
export const onUpdateFeeds = /* GraphQL */ `
  subscription OnUpdateFeeds($filter: ModelSubscriptionFeedsFilterInput) {
    onUpdateFeeds(filter: $filter) {
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
export const onDeleteFeeds = /* GraphQL */ `
  subscription OnDeleteFeeds($filter: ModelSubscriptionFeedsFilterInput) {
    onDeleteFeeds(filter: $filter) {
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
export const onCreateHorses = /* GraphQL */ `
  subscription OnCreateHorses($filter: ModelSubscriptionHorsesFilterInput) {
    onCreateHorses(filter: $filter) {
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
export const onUpdateHorses = /* GraphQL */ `
  subscription OnUpdateHorses($filter: ModelSubscriptionHorsesFilterInput) {
    onUpdateHorses(filter: $filter) {
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
export const onDeleteHorses = /* GraphQL */ `
  subscription OnDeleteHorses($filter: ModelSubscriptionHorsesFilterInput) {
    onDeleteHorses(filter: $filter) {
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
