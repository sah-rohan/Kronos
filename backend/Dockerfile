ARG FUNCTION=api

FROM golang:1.23 AS build
ARG FUNCTION
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -tags lambda.norpc -o /bootstrap ./cmd/${FUNCTION}

FROM public.ecr.aws/lambda/provided:al2023
COPY --from=build /bootstrap ${LAMBDA_RUNTIME_DIR}/bootstrap
ENTRYPOINT ["/var/runtime/bootstrap"]
