# Running the application

- Please enter the correct credentials in twitter4j.properties file in twitter-to-kafka-service
and enter your github password and url on bootstrap.yml file of config-server

## Build with the Maven Wrapper

Java 17 is required. A global Maven installation is not required: the repository
pins Maven 3.9.9 through the Maven Wrapper.

On Linux or macOS:

```shell
./mvnw --version
./mvnw verify
./mvnw install
```

On Windows, use `mvnw.cmd` instead of `./mvnw`.

The standard Maven build does not create container images, including the
`verify` and `install` lifecycles.

## Create container images explicitly

Docker must be running. Activate the opt-in `container-images` profile to run
the existing Spring Boot `build-image` executions during `install`:

```shell
./mvnw -Pcontainer-images install
```

On Windows:

```powershell
.\mvnw.cmd -Pcontainer-images install
```

- Then run docker-compose up command in docker-compose folder
