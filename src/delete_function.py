""" DELETE Lambda. """
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

APP_NAME = environ.get("APP_NAME") or "url-shortener DELETE"
AWS_REGION = environ.get("AWS_REGION") or "us-east-1"
TABLE_NAME = environ.get("TABLE_NAME") or "dev-url-shortner-table"
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)
app = APIGatewayRestResolver()
log: Logger = Logger(service=APP_NAME)
trace: Tracer = Tracer(service=APP_NAME)


@app.delete("/")
@trace.capture_method
def delete_item_by_slug() -> Response:
    """Delete a item from DynamoDB table."""
    event_data = app.current_event.json_body

    slug = event_data.get("slug")
    if not slug:
        log.error("slug is required.")
        return Response(
            status_code=HTTPStatus.BAD_REQUEST.value,
            content_type=content_types.APPLICATION_JSON,
            body=json.dumps({"message": "slug is required."}),
        )
    try:
        if not table.get_item(Key={"slug": slug}).get("Item"):
            log.error(f"Item with slug /{slug} not found.")
            return Response(
                status_code=HTTPStatus.NOT_FOUND.value,
                content_type=content_types.APPLICATION_JSON,
                body=json.dumps({"message": f"Item with a slug of /{slug} not found."}),
            )

        table.delete_item(Key={"slug": slug})

        return Response(
            status_code=HTTPStatus.NO_CONTENT.value,
            content_type=content_types.APPLICATION_JSON,
            headers={"Access-Control-Allow-Origin": "*"},
            body=None,
        )
    except ClientError as error:
        log.error(error.response["Error"]["Message"])
        return Response(
            status_code=HTTPStatus.INTERNAL_SERVER_ERROR.value,
            body=json.dumps({"message": error.response["Error"]["Message"]}),
        )


def lambda_handler(
    event: APIGatewayProxyEvent, context: LambdaContext
) -> dict[str, any]:
    """Lambda handler."""
    return app.resolve(event=event, context=context)
