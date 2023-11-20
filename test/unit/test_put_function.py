""" Unit Tests for PUT Lambda. """
import json
import os
import sys
from http import HTTPStatus
from unittest import TestCase
from unittest.mock import Mock, patch

import boto3
from aws_lambda_powertools.utilities.data_classes import APIGatewayProxyEvent
from aws_lambda_powertools.utilities.typing import LambdaContext
from botocore.exceptions import ClientError
from moto import mock_dynamodb

sys.path.append(os.path.abspath("."))


@mock_dynamodb
class test_put_function(TestCase):
    """Test PUT Lambda."""

    def setUp(self):
        """Setup before each test."""
        super().setUp()
        self.table_name = "dev-url-shortner-table"
        self.dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        self.dynamodb.create_table(
            TableName=self.table_name,
            KeySchema=[
                {"AttributeName": "slug", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "slug", "AttributeType": "S"},
            ],
            ProvisionedThroughput={"ReadCapacityUnits": 1, "WriteCapacityUnits": 1},
        )
        self.table = self.dynamodb.Table(self.table_name)
        from src.put_function import lambda_handler, put_item

        self.lambda_handler = lambda_handler
        self.put_item = put_item
        self.seed_data()

    def seed_data(self):
        table = self.table
        table.put_item(
            Item={
                "slug": "de305d54",
                "targetUrl": "https://www.google.com",
                "createdAt": "2021-01-01T00:00:00.000Z",
            }
        )
        table.put_item(
            Item={
                "slug": "75b4431b",
                "targetUrl": "https://www.example.com",
                "createdAt": "2022-03-08T00:00:00.000Z",
            }
        )

    def test_put_item(self):
        """Test put_item function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "PUT",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(
                    {"slug": "de305d54", "targetUrl": "https://www.microsoft.com"}
                ),
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.OK.value)

    def test_put_item_bad_request(self):
        """Test put_item_by_slug function when there is a BAD REQUEST."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "PUT",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"targetUrl": "https://www.amazon.com"}),
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.BAD_REQUEST.value)
        self.assertEqual(
            json.loads(response["body"])["message"], "The 'slug' field is required."
        )

    def test_put_item_error(self):
        """Test put_item function when there is an error."""
        context: LambdaContext = Mock()
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "PUT",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(
                    {"slug": "2cd9cab6", "targetUrl": "https://www.amazon.com"}
                ),
            }
        )
        with patch(
            "src.put_function.table.update_item",
            side_effect=ClientError(
                error_response={
                    "Error": {"Code": "500", "Message": "Internal Server Error"}
                },
                operation_name="update_item",
            ),
        ):
            response = self.lambda_handler(event, context)
            self.assertEqual(
                response["statusCode"], HTTPStatus.INTERNAL_SERVER_ERROR.value
            )
            self.assertEqual(
                json.loads(response["body"])["message"], "Internal Server Error"
            )

    def tearDown(self) -> None:
        return super().tearDown()
