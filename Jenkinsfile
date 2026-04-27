pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
        }

        stage('Security Scan') {
            steps {
                sh 'npm run security || true'
            }
        }
	
	stage('Code Quality') {
   	    steps {
        withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
            sh 'npm run sonar -- -Dsonar.token=$SONAR_TOKEN'
        }
    }
}
    }
}
