""" Unit Tests for GET Lambda. """
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
class test_get_function(TestCase):
    """Test GET Lambda."""

    def setUp(self):
        """Setup before each test."""
        super().setUp()
        self.table_name = "dev-url-shortner-table"
        self.dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
        self.dynamodb.create_table(
            TableName=self.table_name,
            KeySchema=[
                {"AttributeName": "id", "KeyType": "HASH"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "id", "AttributeType": "S"},
            ],
            ProvisionedThroughput={
                "ReadCapacityUnits": 1,
                "WriteCapacityUnits": 1
            },
        )
        self.table = self.dynamodb.Table(self.table_name)
        from src.get_function import (
            get_all_items,
            get_item_by_id,
            lambda_handler
        )

        self.lambda_handler = lambda_handler
        self.get_all_items = get_all_items
        self.get_items_by_id = get_item_by_id
        self.seed_data()

    def seed_data(self):
        table = self.table
        table.put_item(
            Item={
                "id": "de305d54",
                "url": "https://www.google.com",
                "createdAt": "2021-01-01T00:00:00.000Z",
            }
        )
        table.put_item(
            Item={
                "id": "75b4431b",
                "url": "https://www.example.com",
                "createdAt": "2022-03-08T00:00:00.000Z",
            }
        )

    def test_get_all_items(self):
        """Test get_all_items function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/",
                "httpMethod": "GET",
                "headers": {"Content-Type": "application/json"},
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.OK.value)
        self.assertEqual(json.loads(response["body"])["Count"], 2)
        self.assertEqual(
            json.loads(response["body"])["Items"][0]["id"],
            "de305d54"
        )
        self.assertEqual(
            json.loads(response["body"])["Items"][0]["url"],
            "https://www.google.com"
        )
        self.assertEqual(
            json.loads(response["body"])["Items"][1]["id"],
            "75b4431b"
        )
        self.assertEqual(
            json.loads(response["body"])["Items"][1]["url"],
            "https://www.example.com"
        )

    def test_get_item_by_id(self):
        """Test get_item_by_id function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/de305d54",
                "httpMethod": "GET",
                "headers": {"Content-Type": "application/json"},
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        str_response = json.dumps(response["multiValueHeaders"]["Location"][0])
        self.assertEqual(response["statusCode"], HTTPStatus.FOUND.value)
        self.assertEqual(json.loads(str_response), "https://www.google.com")

    def test_get_item_by_id_not_found(self):
        """Test get_item_by_id function."""
        event = APIGatewayProxyEvent(
            data={
                "path": "/123",
                "httpMethod": "GET",
                "headers": {"Content-Type": "application/json"},
            }
        )
        context: LambdaContext = Mock()
        response = self.lambda_handler(event, context)
        self.assertEqual(response["statusCode"], HTTPStatus.NOT_FOUND.value)
        self.assertEqual(
            json.loads(response["body"])["message"],
            "URL not found"
        )

    def test_get_all_items_error(self):
        """Test get_all_items function when there is an error."""
        with patch("src.get_function.table.scan") as mock_scan:
            mock_scan.side_effect = ClientError(
                {"Error": {"Code": "500", "Message": "Internal Server Error"}},
                "scan"
            )
            event = APIGatewayProxyEvent(
                data={
                    "path": "/",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )
            context: LambdaContext = Mock()
            response = self.lambda_handler(event, context)
            self.assertEqual(
                response["statusCode"], HTTPStatus.INTERNAL_SERVER_ERROR.value
            )
            self.assertEqual(
                json.loads(response["body"])["message"],
                "Internal Server Error"
            )

    def test_get_item_by_id_error(self):
        """Test get_item_by_id function when there is an error."""
        with patch("src.get_function.table.get_item") as mock_get_item:
            mock_get_item.side_effect = ClientError(
                {"Error": {"Code": "500", "Message": "Internal Server Error"}},
                "get_item",
            )
            event = APIGatewayProxyEvent(
                data={
                    "path": "/de305d54",
                    "httpMethod": "GET",
                    "headers": {"Content-Type": "application/json"},
                }
            )
            context: LambdaContext = Mock()
            response = self.lambda_handler(event, context)
            self.assertEqual(
                response["statusCode"], HTTPStatus.INTERNAL_SERVER_ERROR.value
            )
            self.assertEqual(
                json.loads(response["body"])["message"],
                "Internal Server Error"
            )
