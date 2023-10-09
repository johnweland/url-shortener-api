""" GET Lambda. """
import json
from http import HTTPStatus
from os import environ

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    Response,
    content_types,
)
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError

APP_NAME = environ.get("APP_NAME") or "url-shortener GET"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "records"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


@app.get("/api/v1/records")
@trace.capture_method
def get_all_items() -> Response:
    """Get all items from DynamoDB table."""
    try:
        response = table.scan()
        return Response(
            status_code=HTTPStatus.OK.value,
            content_type=content_types.APPLICATION_JSON,
            body=json.dumps(
                {
                    "Count": response["Count"],
                    "Items": response["Items"],
                    "Scanned": response["ScannedCount"],
                }
            ),
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


@app.get("/api/v1/records/<id>")
@trace.capture_method
def get_item_by_id(id: str) -> Response:
    """Get a item from DynamoDB table."""
    try:
        item = table.get_item(Key={"id": id}).get("Item")

        if not item:
            return Response(
                status_code=HTTPStatus.NOT_FOUND.value,
                body=json.dumps({"message": "URL not found"}),
            )
        # return status code 302 and set redirect to url
        return Response(
            status_code=HTTPStatus.FOUND.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Location": str(item["url"])},
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


@trace.capture_lambda_handler
def lambda_handler(
    event: APIGatewayProxyEvent, context: LambdaContext
) -> dict[str, any]:
    """Lambda handler."""
    return app.resolve(event, context)
