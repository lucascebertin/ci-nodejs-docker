pipeline {
  agent any
  environment {
    PROJECT_NAME = "article_app_${BUILD_TAG}"
    COMPOSE_FILE = "docker/build/docker-compose.yml"
    REL_IMAGE = "chicocode/articles_app"
    BUILD_IMAGE = "${REL_IMAGE}:build"
    DOCKER_DISTRIBUTION = "https://registry.hub.docker.com"
    REPO = "github.com/chicocode/ci-nodejs-docker.git"
    GIT_EMAIL = "eu@chicocode.io"
  }
  stages {
    stage('Pull & Build Images') {
      steps {
        sh 'docker-compose -f ${COMPOSE_FILE} build --pull'
      }
    }
    stage('Test') {
      environment {
        INTEGRATION_APP = "app-integration-tests-${BUILD_TAG}"
        ACCEPTANCE_APP = "app-acceptance-tests-${BUILD_TAG}"
        UNIT_APP = "app-unit-tests-${BUILD_TAG}"
      }
      steps {
        parallel(
          "Integration tests": {
            sh 'docker-compose -p ${PROJECT_NAME}-integration -f ${COMPOSE_FILE} run --name ${INTEGRATION_APP} app yarn test:integration --testResultsProcessor jest-junit'
          },
          "Acceptance tests": {
            sh 'docker-compose -p ${PROJECT_NAME}-acceptance -f ${COMPOSE_FILE} run --name ${ACCEPTANCE_APP} app yarn test:acceptance --testResultsProcessor jest-junit'
          },
          "Unit tests": {
            sh '''
               docker run --entrypoint yarn --name ${UNIT_APP} ${BUILD_IMAGE} test:unit --testResultsProcessor jest-junit
               docker cp ${UNIT_APP}:/app/coverage/lcov-report ./coverage
            '''
            publishHTML (target: [
              allowMissing: false,
              alwaysLinkToLastBuild: false,
              keepAll: true,
              reportDir: 'coverage',
              reportFiles: 'index.html',
              reportName: "Istanbul Coverage Report"
            ])
          }
        )
     }
     post {
        always {
          sh '''
             docker cp ${INTEGRATION_APP}:/app/junit.xml ./integration-tests.junit.xml
             docker cp ${ACCEPTANCE_APP}:/app/junit.xml ./acceptance-tests.junit.xml
             docker cp ${UNIT_APP}:/app/junit.xml ./unit-tests.junit.xml
          '''
          junit '*.junit.xml'
          sh 'docker rm ${UNIT_APP}'
        }
      }
    }
    stage('Deploy') {
      agent none
      environment {
        APP = "app-${BUILD_TAG}"
      }
      when {
        branch 'release'
      }
      steps {
        milestone()
        parallel(
          "Build & Push Image Distribution": {
            script {
              version = sh(returnStdout: true, script: 'jq -r .version app/package.json').trim()
              patch = sh(returnStdout: true, script: "semver bump patch ${version}").trim()
              minor = sh(returnStdout: true, script: "semver bump minor ${version}").trim()
              major = sh(returnStdout: true, script: "semver bump major ${version}").trim()
              timeout(time: 2, unit: 'DAYS') {
                env.RELEASE_SCOPE = input message: '🦄 Please answer the unicorn', ok: 'Release!',
                  parameters: [choice(name: 'RELEASE_SCOPE', choices: "👽 unchanged ${version}\n🔥 patch ${patch}\n👹 minor ${minor}\n🎉 major ${major}", description: '🌈 What is the release scope? 🌈')]
              }
              version_number = sh(returnStdout: true, script: "echo ${env.RELEASE_SCOPE} | sed -e 's/👽 unchanged //' | sed -e 's/🔥 patch //' | sed -e 's/👹 minor //' | sed -e 's/🎉 major //' ").trim()
              echo "scope: ${env.RELEASE_SCOPE}"
              sh """
                  docker run --entrypoint sh --name ${APP} ${BUILD_IMAGE} -c 'yarn compile && yarn version --new-version ${version_number}'
                  docker cp ${APP}:app/build/ ./package
                  docker cp ${APP}:app/package.json ./package/package.json
                  docker cp ${APP}:app/yarn.lock ./package/yarn.lock
                  cp package/package.json app/package.json
              """
              rel = docker.build("${REL_IMAGE}", "-f docker/release/Dockerfile .")
              docker.withRegistry("${DOCKER_DISTRIBUTION}", "dockerhub-credentials") {
                rel.push("latest")
                rel.push(version_number)
              }
              withCredentials([usernamePassword(credentialsId: 'github-credentials', passwordVariable: 'GIT_PASSWORD', usernameVariable: 'GIT_USERNAME')]) {
                sh """
                  git config --global user.name '${GIT_USERNAME}'
                  git config --global user.email '${GIT_EMAIL}'
                  git add app/package.json
                  git commit --allow-empty -m 'Unicorn says new release! scope: ${env.RELEASE_SCOPE}'
                  git push https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/chicocode/ci-nodejs-docker.git HEAD:release
                """
              }
            }
          },
          "Generate Artfacts": {
            echo "Vualá"
          }
        )
        milestone()
      }
      post {
        always {
            sh 'docker rm ${APP}'
        }
      }
    }
  }
  post {
      always {
          sh '''
             docker-compose -p ${PROJECT_NAME}-acceptance -f ${COMPOSE_FILE} stop
             docker-compose -p ${PROJECT_NAME}-acceptance -f ${COMPOSE_FILE} rm -f -v
             docker-compose -p ${PROJECT_NAME}-integration -f ${COMPOSE_FILE} stop
             docker-compose -p ${PROJECT_NAME}-integration -f ${COMPOSE_FILE} rm -f -v
             docker network ls --filter name=$(${BUILD_TAG} | sed 's/\\(\\-\\|\\_\\)//g')_default -q | xargs -I ARGS docker network rm ARGS
          '''
      }
  }
}
