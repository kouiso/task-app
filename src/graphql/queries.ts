/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getHorseVitalSigns = /* GraphQL */ `
  query GetHorseVitalSigns($id: ID!) {
    getHorseVitalSigns(id: $id) {
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
`
export const listHorseVitalSigns = /* GraphQL */ `
  query ListHorseVitalSigns(
    $filter: ModelHorseVitalSignsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHorseVitalSigns(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
          age
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
      nextToken
    }
  }
`
export const getHorseExercises = /* GraphQL */ `
  query GetHorseExercises($id: ID!) {
    getHorseExercises(id: $id) {
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
`
export const listHorseExercises = /* GraphQL */ `
  query ListHorseExercises(
    $filter: ModelHorseExercisesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHorseExercises(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`
export const getUsers = /* GraphQL */ `
  query GetUsers($id: ID!) {
    getUsers(id: $id) {
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
`
export const listUsers = /* GraphQL */ `
  query ListUsers(
    $filter: ModelUsersFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listUsers(filter: $filter, limit: $limit, nextToken: $nextToken) {
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
  }
`
export const getHorseFeedIntakes = /* GraphQL */ `
  query GetHorseFeedIntakes($id: ID!) {
    getHorseFeedIntakes(id: $id) {
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
`
export const listHorseFeedIntakes = /* GraphQL */ `
  query ListHorseFeedIntakes(
    $filter: ModelHorseFeedIntakesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHorseFeedIntakes(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
          age
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
      nextToken
    }
  }
`
export const getHorseWaterIntakes = /* GraphQL */ `
  query GetHorseWaterIntakes($id: ID!) {
    getHorseWaterIntakes(id: $id) {
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
`
export const listHorseWaterIntakes = /* GraphQL */ `
  query ListHorseWaterIntakes(
    $filter: ModelHorseWaterIntakesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHorseWaterIntakes(
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
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
      nextToken
    }
  }
`
export const getFeeds = /* GraphQL */ `
  query GetFeeds($id: ID!) {
    getFeeds(id: $id) {
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
`
export const listFeeds = /* GraphQL */ `
  query ListFeeds(
    $filter: ModelFeedsFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listFeeds(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`
export const getHorses = /* GraphQL */ `
  query GetHorses($id: ID!) {
    getHorses(id: $id) {
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
`
export const listHorses = /* GraphQL */ `
  query ListHorses(
    $filter: ModelHorsesFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listHorses(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
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
      nextToken
    }
  }
`
export const usersByHorsesID = /* GraphQL */ `
  query UsersByHorsesID(
    $horsesID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelUsersFilterInput
    $limit: Int
    $nextToken: String
  ) {
    usersByHorsesID(
      horsesID: $horsesID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
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
  }
`
